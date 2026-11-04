// Shared bilingual translations for email Edge Functions
// Used by: send-order-confirmation, send-payment-confirmation,
//          send-order-reminder, send-cancellation-email, send-order-completed

export type Lang = 'fr' | 'en' | 'ar'

export const emailI18n = {
  fr: {
    // Order confirmation
    orderConfirmed: 'Commande confirmée',
    order: 'Commande',
    pickup: 'Retrait',
    asap: 'Dès que possible',
    totalTTC: 'Total TTC',
    wherePickup: 'Où retirer',
    viewMaps: 'Voir sur Google Maps',
    metro: 'La Défense · Sortie 4',
    followUs: 'Retrouvez-nous sur',

    // Payment confirmation
    paymentConfirmed: 'Paiement confirmé',
    awaitingValidation: 'En attente de validation',
    paymentPendingMsg: 'Vous recevrez un email de confirmation dès que le restaurant aura accepté votre commande.',
    pickupAddress: 'Retrait',
    openMaps: 'Ouvrir dans Google Maps',

    // Reminder
    orderWaiting: 'Votre commande vous attend',

    // Cancellation
    orderCancelled: 'Commande annulée',
    reason: 'Raison',
    refundTitle: 'Remboursement automatique',
    refundMsg: (amount: string) => `Le montant de <strong>${amount}</strong> vous sera remboursé sous 5 à 7 jours ouvrés.`,
    contact: 'Contact',

    // Order completed
    thankYou: 'Merci pour votre visite !',
    orderPickedUp: (numero: string) => `Votre commande <strong>${numero}</strong> a bien été récupérée.<br>À très bientôt chez A Beyrouth !`,
    downloadReceipt: 'Télécharger mon reçu',

    // Google review (footer)
    yourReviewMatters: 'Votre avis compte !',
    // Les 5 etoiles restent en visuel juste au-dessus. On ne demande PAS de note
    // chiffree : Google interdit d'orienter la notation et supprime les avis obtenus
    // ainsi, voire sanctionne la fiche.
    rateUs: 'Votre retour nous aide énormément',
    leaveReview: 'Laisser un avis',

    // Email subjects
    subjectConfirmed: (numero: string, pickup: string) => `Commande ${numero} validée · Retrait ${pickup} - A Beyrouth`,

    // Retrait sans file d'attente (15/09/2026)
    skipQueueTitle: 'Ne faites pas la queue',
    skipQueueText: (numero: string) => `Allez directement à la caisse : votre commande <strong>${numero}</strong> vous y attend.`,
    skipQueueShort: 'Direct à la caisse, sans faire la queue',
    confirmedPreheader: (numero: string) => `Commande ${numero} validée · Ne faites pas la queue, allez directement à la caisse`,
    subjectPayment: (numero: string) => `✅ Paiement confirmé - Commande ${numero} - A Beyrouth`,
    subjectReminder: (numero: string, pickup: string) => `⏰ ${numero} · Votre commande prête depuis ${pickup} - A Beyrouth`,
    subjectCancelled: (numero: string) => `❌ Commande ${numero} annulée - Remboursement en cours`,
    subjectCompleted: (numero: string) => `Merci pour votre visite - Commande ${numero} - A Beyrouth`,

    // Devis traiteur (11/08/2026)
    quoteTitle: 'Demande de devis reçue',
    quoteRegistered: 'Votre demande a été enregistrée',
    quoteStudy: 'Notre équipe va étudier votre demande et vous envoyer un devis personnalisé dans les 48 heures.',
    quoteSummary: 'Récapitulatif',
    quoteName: 'Nom',
    quoteEmail: 'Email',
    quotePhone: 'Téléphone',
    quoteEventType: "Type d'événement",
    quoteGuests: 'Nombre de personnes',
    quoteDate: 'Date souhaitée',
    quoteMessage: 'Message',
    quoteAddress: '4 Esplanade du Général de Gaulle,<br>92400 Courbevoie (La Défense)',
    subjectQuote: '📋 Demande de devis bien reçue - A Beyrouth',
    quotePreheader: 'Demande de devis reçue - A Beyrouth',
    metroExit: 'Sortie 4 du métro La Défense',
    quoteThanks: (prenom: string) => `Merci ${prenom}, nous revenons vers vous sous 48h.`,
    quoteYourMessage: 'Votre message',
  },
  en: {
    // Order confirmation
    orderConfirmed: 'Order confirmed',
    order: 'Order',
    pickup: 'Pickup',
    asap: 'As soon as possible',
    totalTTC: 'Total incl. VAT',
    wherePickup: 'Where to pick up',
    viewMaps: 'View on Google Maps',
    metro: 'La Défense · Exit 4',
    followUs: 'Follow us on',

    // Payment confirmation
    paymentConfirmed: 'Payment confirmed',
    awaitingValidation: 'Awaiting validation',
    paymentPendingMsg: 'You will receive a confirmation email once the restaurant has accepted your order.',
    pickupAddress: 'Pickup',
    openMaps: 'Open in Google Maps',

    // Reminder
    orderWaiting: 'Your order is waiting for you',

    // Cancellation
    orderCancelled: 'Order cancelled',
    reason: 'Reason',
    refundTitle: 'Automatic refund',
    refundMsg: (amount: string) => `The amount of <strong>${amount}</strong> will be refunded within 5 to 7 business days.`,
    contact: 'Contact',

    // Order completed
    thankYou: 'Thank you for your visit!',
    orderPickedUp: (numero: string) => `Your order <strong>${numero}</strong> has been picked up.<br>See you soon at A Beyrouth!`,
    downloadReceipt: 'Download my receipt',

    // Google review (footer)
    yourReviewMatters: 'Your opinion matters!',
    rateUs: 'Your feedback helps us enormously',
    leaveReview: 'Leave a review',

    // Email subjects
    subjectConfirmed: (numero: string, pickup: string) => `Order ${numero} confirmed · Pickup ${pickup} - A Beyrouth`,

    // Skip the queue (15/09/2026)
    skipQueueTitle: 'No need to queue',
    skipQueueText: (numero: string) => `Go straight to the till: your order <strong>${numero}</strong> is waiting for you there.`,
    skipQueueShort: 'Straight to the till, no queuing',
    confirmedPreheader: (numero: string) => `Order ${numero} confirmed · No need to queue, go straight to the till`,
    subjectPayment: (numero: string) => `✅ Payment confirmed - Order ${numero} - A Beyrouth`,
    subjectReminder: (numero: string, pickup: string) => `⏰ ${numero} · Your order ready since ${pickup} - A Beyrouth`,
    subjectCancelled: (numero: string) => `❌ Order ${numero} cancelled - Refund in progress`,
    subjectCompleted: (numero: string) => `Thank you for your visit - Order ${numero} - A Beyrouth`,

    // Catering quote (11/08/2026)
    quoteTitle: 'Quote request received',
    quoteRegistered: 'Your request has been registered',
    quoteStudy: 'Our team will review your request and send you a tailored quote within 48 hours.',
    quoteSummary: 'Summary',
    quoteName: 'Name',
    quoteEmail: 'Email',
    quotePhone: 'Phone',
    quoteEventType: 'Event type',
    quoteGuests: 'Number of guests',
    quoteDate: 'Preferred date',
    quoteMessage: 'Message',
    quoteAddress: '4 Esplanade du Général de Gaulle,<br>92400 Courbevoie (La Défense), France',
    subjectQuote: '📋 Quote request received - A Beyrouth',
    quotePreheader: 'Quote request received - A Beyrouth',
    metroExit: 'Exit 4, La Défense metro station',
    quoteThanks: (prenom: string) => `Thank you ${prenom}, we will get back to you within 48 hours.`,
    quoteYourMessage: 'Your message',
  },
  ar: {
    // Arabe (04/11/2026) : le français et l'anglais ci-dessus ne changent pas
    orderConfirmed: 'تم تأكيد الطلب',
    order: 'الطلب',
    pickup: 'الاستلام',
    asap: 'في أقرب وقت ممكن',
    totalTTC: 'المجموع شامل الضريبة',
    wherePickup: 'مكان الاستلام',
    viewMaps: 'عرض على خرائط Google',
    metro: 'La Défense · المخرج 4',
    followUs: 'تابعونا على',

    paymentConfirmed: 'تم تأكيد الدفع',
    awaitingValidation: 'بانتظار الموافقة',
    paymentPendingMsg: 'ستصلك رسالة تأكيد فور قبول المطعم لطلبك.',
    pickupAddress: 'الاستلام',
    openMaps: 'فتح في خرائط Google',

    orderWaiting: 'طلبك بانتظارك',

    orderCancelled: 'تم إلغاء الطلب',
    reason: 'السبب',
    refundTitle: 'استرداد تلقائي',
    refundMsg: (amount: string) => `سيُعاد إليك مبلغ <strong>${amount}</strong> خلال 5 إلى 7 أيام عمل.`,
    contact: 'للتواصل',

    thankYou: 'شكرًا لزيارتك!',
    orderPickedUp: (numero: string) => `تم استلام طلبك <strong>${numero}</strong>.<br>نراك قريبًا في A Beyrouth!`,
    downloadReceipt: 'تحميل الإيصال',

    yourReviewMatters: 'رأيك يهمّنا!',
    rateUs: 'ملاحظاتك تساعدنا كثيرًا',
    leaveReview: 'اترك تقييمًا',

    subjectConfirmed: (numero: string, pickup: string) => `تم تأكيد الطلب ${numero} · الاستلام ${pickup} - A Beyrouth`,

    skipQueueTitle: 'لا داعي للانتظار في الطابور',
    skipQueueText: (numero: string) => `توجّه مباشرة إلى الصندوق: طلبك <strong>${numero}</strong> بانتظارك هناك.`,
    skipQueueShort: 'مباشرة إلى الصندوق، دون طابور',
    confirmedPreheader: (numero: string) => `تم تأكيد الطلب ${numero} · لا داعي للطابور، توجّه مباشرة إلى الصندوق`,
    subjectPayment: (numero: string) => `✅ تم تأكيد الدفع - الطلب ${numero} - A Beyrouth`,
    subjectReminder: (numero: string, pickup: string) => `⏰ ${numero} · طلبك جاهز منذ ${pickup} - A Beyrouth`,
    subjectCancelled: (numero: string) => `❌ تم إلغاء الطلب ${numero} - الاسترداد جارٍ`,
    subjectCompleted: (numero: string) => `شكرًا لزيارتك - الطلب ${numero} - A Beyrouth`,

    quoteTitle: 'تم استلام طلب عرض السعر',
    quoteRegistered: 'تم تسجيل طلبك',
    quoteStudy: 'سيدرس فريقنا طلبك ويرسل إليك عرض سعر مخصّصًا خلال 48 ساعة.',
    quoteSummary: 'الملخّص',
    quoteName: 'الاسم',
    quoteEmail: 'البريد الإلكتروني',
    quotePhone: 'الهاتف',
    quoteEventType: 'نوع المناسبة',
    quoteGuests: 'عدد الأشخاص',
    quoteDate: 'التاريخ المطلوب',
    quoteMessage: 'الرسالة',
    quoteAddress: '4 Esplanade du Général de Gaulle,<br>92400 Courbevoie (La Défense), France',
    subjectQuote: '📋 تم استلام طلب عرض السعر - A Beyrouth',
    quotePreheader: 'تم استلام طلب عرض السعر - A Beyrouth',
    metroExit: 'المخرج 4 من مترو La Défense',
    quoteThanks: (prenom: string) => `شكرًا ${prenom}، سنعود إليك خلال 48 ساعة.`,
    quoteYourMessage: 'رسالتك',
  }
}

export function t(lang: Lang) {
  return emailI18n[lang] ?? emailI18n.fr
}

// Arabe : langue de la commande lue en base (tout ce qui n'est ni 'en' ni 'ar' reste en français)
export function langueCommande(v: unknown): Lang {
  return v === 'en' ? 'en' : v === 'ar' ? 'ar' : 'fr'
}

// Noms arabes des plats (par id de menu_items) et des composantes de formule.
// Les noms stockés dans la commande restent en français (clés lues par la tablette) : affichage seulement.
export const MENU_AR: Record<number, string> = {"23": "شاورما دجاج", "24": "شيش طاووق", "25": "شاورما لحم", "26": "فلافل", "27": "نباتي", "28": "سودة دجاج", "29": "كفتة", "30": "سجق", "31": "كفتة مشوية", "32": "شيش طاووق", "33": "شاورما دجاج", "35": "مشاوي مشكّلة", "36": "حمص", "37": "متبل", "38": "تبولة", "40": "عيران", "41": "مياه", "42": "وجبة 1", "43": "وجبة 2", "44": "وجبة 3", "45": "وجبة 4", "47": "بيروت دجاج", "48": "بيروت لحم", "49": "نباتي", "50": "فلافل", "51": "لبنان", "52": "جبيل", "53": "مهلبية", "54": "نمورة", "55": "بقلاوة", "57": "Pepsi", "58": "Fanta", "59": "Oasis Tropical", "60": "Lipton بنكهة الخوخ", "61": "7Up", "62": "Coca-Cola Zero", "63": "Perrier", "64": "سلطة الراهب", "65": "مسقعة", "66": "ورق عنب", "67": "فلافل (القطعة)", "68": "فطاير (القطعة)", "69": "سمبوسك جبنة (القطعة)", "70": "رقاقات جبنة (القطعة)", "71": "سمبوسك لحمة (القطعة)", "72": "كبة (القطعة)", "73": "تشكيلة بقلاوة 250g", "74": "تشكيلة بقلاوة 500g", "75": "خبز لبناني", "76": "صلصة الثوم", "77": "صلصة حارّة", "78": "صلصة طحينة", "79": "Box Beyrouth", "82": "Box Express"}
export const COMPO_AR: Record<string, string> = {"Feuilletés": "معجنات", "Boisson": "مشروب", "Sandwich": "ساندويش", "Sauce": "صلصة", "Entrée froide": "مقبلات باردة", "Dessert": "حلوى", "Fromage": "جبنة", "Boeuf": "لحم", "Épinard": "سبانخ", "Falafel": "فلافل", "Sauce à l'ail": "صلصة الثوم", "Ketchup": "كاتشب"}

// Mail en arabe : lecture de droite à gauche. N'est appelé QUE pour lang === 'ar'.
export function versRtl(html: string, titre: string): string {
  return html
    .replace(/<html([^>]*)>/i, '<html$1 dir="rtl" lang="ar">')
    .replace(/<title>[^<]*<\/title>/i, `<title>${titre}</title>`)
    .replace(/(<body[^>]*>)/i, '$1<div dir="rtl" style="direction:rtl;">')
    .replace(/<\/body>/i, '</div></body>')
    .replace(/text-align:\s*left/g, '\u0000L').replace(/text-align:\s*right/g, 'text-align:left').replace(/\u0000L/g, 'text-align:right')
    .replace(/align="left"/g, '\u0000A').replace(/align="right"/g, 'align="left"').replace(/\u0000A/g, 'align="right"')
    // Texte entièrement latin (adresse, @a_beyrouth, numéro) : gardé de gauche à droite, sinon « 4 » et « @ » passent à la fin
    .replace(/(<body[\s\S]*)$/i, (corps) => corps.replace(/>([^<>]*[A-Za-z0-9][^<>]*)</g, (m, txt) =>
      (/[\u0600-\u06FF]/.test(txt) || !txt.trim() || txt.trim() === '&nbsp;') ? m : `><span dir="ltr">${txt}</span><`))
}
