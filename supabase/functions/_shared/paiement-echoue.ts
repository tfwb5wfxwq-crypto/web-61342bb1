// ─── ALERTES « PAIEMENT ÉCHOUÉ » — code commun (02/10/2026) ───────────────────
// Avant : la même fonction était COPIÉE dans paygreen-webhook, check-payment-status et
// monitor-pending-orders, et elle sonnait à CHAQUE commande expirée.
// Or la ligne `orders` + le paiement PayGreen sont créés au clic « Passer la commande »,
// AVANT le choix du moyen de paiement. « Retour au panier » n'annule rien : renvoyer la
// commande crée un NOUVEAU numéro et l'ancien expire ~10 min plus tard → alerte « échec »
// même quand le client a payé entre-temps (Amale, monira, Adélie, Emeric… 22-28/09).
//
// Désormais, au moment où une commande passe en échec :
//   1. le même client (tél OU e-mail) a une commande PAYÉE peu avant / après  → silence
//   2. le client a relancé une commande plus récente                         → silence
//      (c'est la plus récente qui décidera)
//   3. sinon, ALERTE IMMÉDIATE seulement si ça vaut un appel :
//        - carte saisie et REFUSÉE par la banque, ou
//        - ≥ 2 tentatives en 2 h sans jamais payer
//   4. le reste (abandon simple à l'écran de paiement) → résumé du heartbeat de 08:00.
// Si une alerte immédiate a été envoyée et que le client paie ensuite (< 2 h),
// monitor-pending-orders envoie UNE fois « ✅ <prénom> a finalement payé ».
//
// La décision est inscrite dans `cancellation_reason` (étiquette entre crochets), ce qui
// évite toute nouvelle colonne et rend chaque décision lisible en base :
//   [alerte] · [resume] · [payee 1234 AB] · [remplacee 1234 AB] · [alerte][puis payee …]
// L'écriture de `cancellation_reason` reste la RÉCLAMATION ATOMIQUE : trois chemins peuvent
// annuler la même commande, un seul gagne l'écriture et décide. Pas de doublon possible.

export const FENETRE_MS = 2 * 3600 * 1000          // « même client » = dans les 2 h
const AVANT_MS = 15 * 60 * 1000                    // une commande payée juste AVANT compte aussi
export const TAG_ALERTE = '[alerte]'
export const TAG_RESUME = '[resume]'
export const TAG_PUIS_PAYEE = '[puis payee'

// Statuts qui veulent dire « le client a payé » (refunded inclus : il avait payé).
export function estPayee(statut: string | null | undefined): boolean {
  return !!statut && statut !== 'pending' && statut !== 'cancelled'
}

// ─── Lire les tentatives de paiement (14/09/2026) ─────────────────────────────
//   0 transaction  = le client a vu le formulaire et n'a JAMAIS saisi de carte
//   1+ refusee     = carte saisie, refusee par SA banque (le site n'y est pour rien)
export function lireTentatives(pgData: any): { nb: number; refusees: number; ligne: string; dernier: string | null } {
  const src: any = pgData?.data ?? pgData
  // Ne conclure "jamais saisi de carte" QUE si PayGreen a bien renvoye le champ.
  const connu = !!src && Object.prototype.hasOwnProperty.call(src, 'transactions')
  const tx: any[] = (connu ? (src.transactions ?? []) : []) as any[]
  const statuts = tx
    .map((t: any) => String(t?.status ?? '').replace('transaction.', ''))
    .filter((s: string) => s.length > 0)
  const refusees = statuts.filter((s: string) => s.includes('refused') || s.includes('failed')).length
  const dernier = statuts.length ? statuts[statuts.length - 1] : null
  let ligne = ''
  if (!pgData || !connu) {
    ligne = ''
  } else if (tx.length === 0) {
    ligne = "\n🚪 Il n'a JAMAIS saisi de carte : arrete AVANT de payer."
  } else if (refusees > 0) {
    ligne = `\n💳 Carte saisie et REFUSEE par sa banque (${refusees} tentative${refusees > 1 ? 's' : ''}) — plafond, opposition ou solde. Le site n'y est pour rien.`
  } else {
    ligne = `\n💳 ${tx.length} tentative(s) de paiement : ${statuts.join(', ')}.`
  }
  return { nb: connu ? tx.length : -1, refusees, ligne, dernier }
}

type Commande = {
  id: string; numero: string; statut: string; created_at: string; total: number | null
  client_prenom: string | null; client_telephone: string | null; client_email: string | null
  cancellation_reason?: string | null
}

const COLS = 'id, numero, statut, created_at, total, client_prenom, client_telephone, client_email, cancellation_reason'

function echapperIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

// Toutes les commandes du même client (même téléphone OU même e-mail) entre debut et fin.
// Deux requêtes simples plutôt qu'un .or() : un e-mail ou un téléphone tapé librement peut
// contenir des virgules/parenthèses qui casseraient la syntaxe PostgREST.
export async function commandesDuClient(
  supabase: any, o: { id?: string; client_telephone?: string | null; client_email?: string | null },
  debutIso: string, finIso: string,
): Promise<Commande[]> {
  const parId = new Map<string, Commande>()
  const tel = (o.client_telephone ?? '').trim()
  const mail = (o.client_email ?? '').trim()
  const requetes: Promise<any>[] = []
  if (tel) {
    requetes.push(supabase.from('orders').select(COLS)
      .eq('client_telephone', tel).gte('created_at', debutIso).lte('created_at', finIso).limit(50))
  }
  if (mail) {
    requetes.push(supabase.from('orders').select(COLS)
      .ilike('client_email', echapperIlike(mail)).gte('created_at', debutIso).lte('created_at', finIso).limit(50))
  }
  for (const r of await Promise.all(requetes)) {
    for (const c of (r?.data ?? []) as Commande[]) if (c.id !== o.id) parId.set(c.id, c)
  }
  return [...parId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

function envoyerTelegram(text: string): Promise<unknown> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')
  if (!botToken || !chatId) return Promise.resolve(null)
  // Texte BRUT (pas de parse_mode) : prénom/plats tapés par le client ne peuvent rien casser.
  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  })
}

async function etiqueter(supabase: any, orderId: string, raison: string, tag: string) {
  try {
    await supabase.from('orders').update({ cancellation_reason: `${raison} ${tag}` })
      .eq('id', orderId).eq('cancellation_reason', raison)
  } catch (_) { /* jamais bloquant : l'étiquette ne sert qu'au résumé et au suivi */ }
}

export async function alertPaiementEchoue(supabase: any, orderId: string, pgStatus: string, pgData?: any) {
  try {
    const tentatives = lireTentatives(pgData)
    const refuse = pgStatus.includes('refused') || tentatives.refusees > 0
    const motif =
      pgStatus.includes('refused') ? 'refuse par la banque ou la carte'
      : pgStatus.includes('expired')
        ? (pgData && tentatives.nb === 0   // -1 = information indisponible
            ? 'arret avant paiement (aucune carte saisie)'
            : 'delai depasse apres une tentative de paiement')
      : 'annule pendant le paiement'
    const raison = `echec paiement : ${motif} (${pgStatus})`

    // RÉCLAMATION ATOMIQUE : un seul des trois chemins passe.
    const { data } = await supabase
      .from('orders')
      .update({ cancellation_reason: raison })
      .eq('id', orderId)
      .eq('statut', 'cancelled')
      .is('cancellation_reason', null)
      .select('id, numero, created_at, total, client_prenom, client_telephone, client_email, items, heure_retrait')

    const o = data?.[0]
    if (!o) return // deja traite par un autre chemin, on se tait

    // Trace durable (arrets avant paiement vs refus bancaires). Isole et non bloquant.
    if (pgData) {
      try {
        await supabase
          .from('orders')
          .update({ payment_attempts: tentatives.nb, payment_last_tx_status: tentatives.dernier })
          .eq('id', orderId)
      } catch (_) { /* jamais bloquant */ }
    }

    // ── Le même client a-t-il payé, ou relancé une commande ? ──────────────────
    // En cas de pépin sur ces lectures, on retombe sur l'ancien comportement (alerte).
    let autres: Commande[] = []
    let lectureOk = true
    try {
      const t0 = Date.parse(o.created_at)
      autres = await commandesDuClient(
        supabase, o,
        new Date(t0 - FENETRE_MS).toISOString(),
        new Date(t0 + FENETRE_MS).toISOString(),
      )
    } catch (_) { lectureOk = false }

    const t0 = Date.parse(o.created_at)
    const payee = autres.find(c => estPayee(c.statut) && Date.parse(c.created_at) >= t0 - AVANT_MS)
    if (payee) {
      await etiqueter(supabase, o.id, raison, `[payee ${payee.numero}]`)
      return // il a payé : rien à rappeler
    }
    const plusRecente = autres.filter(c => Date.parse(c.created_at) > t0).pop()
    if (plusRecente) {
      await etiqueter(supabase, o.id, raison, `[remplacee ${plusRecente.numero}]`)
      return // il a relancé : c'est la nouvelle commande qui décidera
    }

    // C'est sa DERNIÈRE commande et rien n'est payé : combien d'essais dans les 2 h ?
    const echecsAvant = autres.filter(c => c.statut === 'cancelled' && Date.parse(c.created_at) < t0)
    const nbEssais = 1 + echecsAvant.length
    const refusAvant = echecsAvant.some(c => String(c.cancellation_reason ?? '').includes('refuse'))
    const test = Number(o.total ?? 0) <= 1   // paniers à 0,70 € = tests de Ludovik

    const vautUnAppel = !lectureOk || (!test && (refuse || nbEssais >= 2))
    if (!vautUnAppel) {
      await etiqueter(supabase, o.id, raison, TAG_RESUME)
      return // simple abandon : il sera dans le résumé de 08:00
    }
    await etiqueter(supabase, o.id, raison, TAG_ALERTE)

    const plats = Array.isArray(o.items)
      ? o.items.map((i: any) => `${i.qty ?? i.quantite ?? 1}x ${i.nom ?? '?'}`).join(', ')
      : ''
    const insiste = nbEssais >= 2
      ? `\n🔁 ${nbEssais} tentatives en 2 h, aucune payee` +
        (refusAvant ? ' (une carte deja refusee avant).' : '.') +
        ` Commandes : ${[...echecsAvant.map(c => c.numero), o.numero].join(', ')}.`
      : ''
    const text =
      `⚠️ Paiement echoue — un client n a pas pu payer\n` +
      `Raison : ${motif}\n` +
      `Client : ${o.client_prenom || '?'} — ${o.client_telephone || '?'} (${o.client_email || '?'})\n` +
      `Panier : ${Number(o.total ?? 0).toFixed(2)} EUR — commande ${o.numero}\n` +
      (plats ? `Articles : ${plats}\n` : '') +
      (o.heure_retrait ? `Retrait demande : ${o.heure_retrait}\n` : '') +
      tentatives.ligne +
      insiste +
      `\n👉 Tu peux le rappeler pour recuperer la commande.` +
      `\n(Si il paie dans les 2 h, tu recevras « ✅ finalement paye ».)`
    await envoyerTelegram(text)
  } catch (e) {
    console.error('alertPaiementEchoue failed (non bloquant):', e)
  }
}

// ─── Suivi : « ✅ finalement payé » (appelé par monitor-pending-orders, toutes les 2 min) ──
// Uniquement pour les commandes qui ont déclenché une ALERTE IMMÉDIATE : sans alerte, il n'y
// a rien à corriger dans la tête de Ludovik, donc on se tait (le résumé de 08:00 le dira).
export async function suiviPaiementsRecuperes(supabase: any) {
  try {
    const depuis = new Date(Date.now() - FENETRE_MS - 15 * 60 * 1000).toISOString()
    const { data: alertees } = await supabase
      .from('orders')
      .select(COLS)
      .eq('statut', 'cancelled')
      .gte('created_at', depuis)
      .like('cancellation_reason', `%${TAG_ALERTE}%`)
      .not('cancellation_reason', 'like', `%${TAG_PUIS_PAYEE}%`)
      .limit(20)
    for (const o of (alertees ?? []) as Commande[]) {
      const t0 = Date.parse(o.created_at)
      const autres = await commandesDuClient(supabase, o,
        new Date(t0).toISOString(), new Date(t0 + FENETRE_MS).toISOString())
      const payee = autres.find(c => estPayee(c.statut))
      if (!payee) continue
      const avant = String(o.cancellation_reason ?? '')
      // Atomique : si deux passes du cron se chevauchent, une seule envoie le message.
      const { data: claim } = await supabase.from('orders')
        .update({ cancellation_reason: `${avant}${TAG_PUIS_PAYEE} ${payee.numero}]` })
        .eq('id', o.id).eq('cancellation_reason', avant).select('id')
      if (!claim || claim.length === 0) continue
      await envoyerTelegram(
        `✅ ${o.client_prenom || 'Le client'} a finalement paye — commande ${payee.numero} ` +
        `(${Number(payee.total ?? 0).toFixed(2)} EUR).\n` +
        `Inutile de le rappeler pour la commande ${o.numero}.`
      )
    }
  } catch (e) {
    console.error('suiviPaiementsRecuperes failed (non bloquant):', e)
  }
}

// ─── Résumé des abandons (lu par system-heartbeat à 08:00) ────────────────────
// Renvoie des lignes de texte BRUT ; l'appelant les échappe s'il envoie en Markdown.
export async function resumeAbandons(supabase: any, depuisIso: string): Promise<{
  payees: number; abandons: number; recuperes: number; aRappeler: string[]
} | null> {
  try {
    const { count: payees } = await supabase.from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', depuisIso)
      .not('statut', 'in', '(pending,cancelled)')
      .gt('total', 1)
    const { data: abandons } = await supabase.from('orders')
      .select(COLS)
      .eq('statut', 'cancelled')
      .gte('created_at', depuisIso)
      .like('cancellation_reason', `%${TAG_RESUME}%`)
      .order('created_at', { ascending: true })
      .limit(50)
    let recuperes = 0
    const aRappeler: string[] = []
    let nb = 0
    for (const o of (abandons ?? []) as Commande[]) {
      if (Number(o.total ?? 0) <= 1) continue // tests
      nb++
      const t0 = Date.parse(o.created_at)
      const autres = await commandesDuClient(supabase, o,
        new Date(t0 - AVANT_MS).toISOString(), new Date(t0 + FENETRE_MS).toISOString())
      if (autres.some(c => estPayee(c.statut))) { recuperes++; continue }
      if (autres.some(c => Date.parse(c.created_at) > t0)) { nb--; continue } // relancé : compté via la suivante
      const heure = new Date(o.created_at).toLocaleTimeString('fr-FR',
        { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
      aRappeler.push(`${heure} ${o.client_prenom || '?'} — ${Number(o.total ?? 0).toFixed(2)} EUR — ${o.client_telephone || o.client_email || '?'}`)
    }
    return { payees: payees ?? 0, abandons: nb, recuperes, aRappeler }
  } catch (e) {
    console.error('resumeAbandons failed (non bloquant):', e)
    return null
  }
}
