/**
 * Système i18n pour Beyrouth Express
 * Gère français et anglais avec détection auto + switch manuel
 */

// Traductions complètes FR/EN
const translations = {
  fr: {
    // SEO & Meta
    meta: {
      title: "Restaurant Libanais La Défense - A Beyrouth | Click & Collect",
      description: "Restaurant libanais A Beyrouth à La Défense Courbevoie. Commandez en ligne : shawarma, mezze, grillades, falafel. Retrait express 15 min. Cartes restaurant acceptées (Swile, Ticket Restaurant, Conecs).",
      ogTitle: "A Beyrouth · Restaurant Libanais La Défense",
      ogDescription: "Cuisine libanaise authentique à La Défense. Commandez en ligne, retirez en 15 min. Cartes restaurant acceptées.",
      cuisine: "Libanaise",
      paymentMethods: "Carte bancaire, Swile, Ticket Restaurant, Restoflash, Conecs"
    },

    // Header & Navigation
    nav: {
      orderNow: "Commander",
      menu: "Menu",
      catering: "Traiteur",
      contact: "Contact"
    },

    // Timepicker & Pickup
    timepicker: {
      chooseSlot: "Choisir un créneau",
      prep15min: "~15 min de préparation",
      orChooseSlot: "ou choisir un créneau",
      pickupTime: "Retrait prévu",
      asap: "Dès que possible",
      nextSlot: "Créneau le plus proche",
      closesAt: "Ferme à",
      open: "Ouvert",
      // Ajouts etape 6 (statut d en tete, accueil et traiteur)
      closed: "Fermé",
      tempClosure: "Fermeture temporaire",
      until: "jusqu'à",
      // Separateur d heure : « 20h30 » en francais, « 20:30 » en anglais.
      hourSep: "h"
    },

    // Jours de la semaine, dans l ordre de getDay() : 0 = dimanche.
    days: {
      sunday: "Dimanche", monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi",
      thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi"
    },

    // Cart & Checkout
    cart: {
      placeOrder: "Passer la commande",
      modify: "Modifier",
      addToCart: "Ajouter au panier",
      pickupTime: "Heure de retrait",
      yourOrder: "Votre commande",
      empty: "Votre panier est vide",
      add: "Ajouter",
      remove: "Retirer",
      total: "Total",
      subtotal: "Sous-total",
      optin: "Me tenir informé des offres et promotions",
      securePayment: "Paiement en ligne sécurisé (CB, carte restaurant)",
      payNow: "Payer",
      orderNow: "Commander maintenant",
      // Ajouts etape 6 (bloc panier). Les valeurs FR sont copiees a l identique
      // depuis index.html : aucun texte francais ne change a l ecran.
      tempClosed: "Le click & collect est temporairement fermé.\nRéouverture prochaine.",
      formulaAdded: "Formule ajoutée au panier !",
      drinkWithThat: "Une boisson avec ça ?",
      // Message d indisponibilite. Fonction car le pluriel et les noms varient.
      removedUnavailable: (noms, pluriel) =>
        `${noms} ${pluriel ? 'ne sont plus disponibles' : "n'est plus disponible"} et ${pluriel ? 'ont été retirés' : 'a été retiré'} de votre panier`
    },

    // Menu Items
    menu: {
      loading: "Chargement du menu...",
      customize: "Personnalisez votre formule",
      soonAvailable: "Bientôt disponible",
      formula1: "Formule 1",
      formula1Desc: "sandwich + 2 feuilletés + boisson",
      addDrink: "Une boisson fraîche avec votre plat ?",
      from: "À partir de"
    },

    // Order Status
    status: {
      paid: "Payée",
      paidDesc: "Commande reçue et payée",
      accepted: "Acceptée",
      acceptedDesc: "Le restaurant a accepté votre commande",
      preparing: "En préparation",
      preparingDesc: "Votre commande est en cours de préparation",
      ready: "Prête !",
      readyDesc: "Venez récupérer votre commande",
      pickedUp: "Récupérée",
      pickedUpDesc: "Bon appétit !",
      cancelled: "Annulée"
    },

    // Confirmation Page
    confirmation: {
      backToMenu: "Retour au menu",
      loading: "Chargement de votre commande...",
      title: "Commande confirmée | Beyrouth Express",
      paymentValidated: "Paiement validé !",
      orderRegistered: "Votre commande a été enregistrée",
      pickupTime: "Retrait prévu",
      whereToPickup: "Où récupérer",
      address: "4 Esplanade du Général de Gaulle<br>92400 Courbevoie (La Défense)",
      metro: "Sortie 4 du métro La Défense",
      examining: "Le restaurant examine votre commande.<br>Vous recevrez un email dès validation.",
      emailSent: "Email envoyé",
      willNotify: "Vous serez notifié dès validation",
      preparing: "Préparation en cours",
      readyAt: "Votre commande sera prête à",
      orderAccepted: "Commande acceptée",
      orderReady: "Votre commande est prête !",
      canPickup: "Vous pouvez venir la récupérer au restaurant",
      commandReady: "Commande prête !",
      pickupNow: "Venez la récupérer chez A Beyrouth",
      seeyouSoon: "À très bientôt chez A Beyrouth 🧆",
      // Ajouts etape 6 (page de confirmation). Textes copies A L IDENTIQUE
      // depuis confirmation.html, y compris la ponctuation : certains
      // ressemblent aux cles ci dessus mais n en sont pas (« Commande
      // acceptée » sans point d exclamation existe deja au dessus).
      willConfirmSoon: "Votre commande va être confirmée dans quelques instants",
      orderAcceptedExcl: "Commande acceptée !",
      beingPrepared: "Votre commande est en préparation",
      comePickUp: "Venez la récupérer",
      enjoyMeal: "Bon appétit !",
      orderPickedUp: "Commande récupérée",
      thanksForOrder: "Merci pour votre commande !",
      thankYouSoon: "Merci et à bientôt !",
      orderCancelled: "Commande annulée",
      refundInProgress: "Remboursement en cours",
      refundDelay: "Le remboursement sera effectué sous 5 à 7 jours ouvrés.",
      cancellationEmailSent: "Email d'annulation envoyé",
      autoRefresh: "Cette page se met à jour automatiquement",
      asapLower: "dès que possible",
      willBeReady: "Votre commande sera prête"
    },

    // Admin
    admin: {
      login: "Entrez le code admin pour accéder",
      completedOrders: "Commandes terminées",
      noCompleted: "Aucune commande terminée",
      toggleDishes: "Activez/désactivez des plats individuellement. Les changements sont visibles instantanément chez les clients.",
      year: "Année",
      delaySlots: "⏸️ Décaler créneaux :",
      untilTomorrow: "🌙 Jusqu'à demain",
      reminded: "📧 Relancé il y a",
      asap: "⚡ Dès que possible",
      pickedUp: "📦 Récupérée",
      completed: "✓ Terminée",
      irreversible: "Cette action est irréversible.",
      spent: "dépensé",
      last: "dernière",
      totalSpent: "Total dépensé",
      favDishes: "🍽️ Plats préférés"
    },

    // Emails
    email: {
      orderConfirmed: "Commande confirmée",
      number: "Numéro",
      seeyouSoon: "À bientôt !",
      paymentConfirmed: "Paiement confirmé",
      paymentReceived: "✅ Paiement reçu",
      secondEmail: "Vous recevrez un second email avec le récapitulatif dès que le restaurant aura validé votre commande.",
      orderNumber: "Numéro de commande",
      scheduledTime: "Heure prévue",
      quoteReceived: "Demande bien reçue",
      answerIn48h: "Réponse sous 48h",
      requestRegistered: "✅ Demande enregistrée",
      studyRequest: "Notre équipe va étudier votre demande et vous envoyer un devis personnalisé dans les 48 heures.",
      summary: "Récapitulatif",
      eventType: "Type d'événement",
      desiredDate: "Date souhaitée",
      orderDetail: "Détail de votre commande",
      pickupLocation: "Lieu de retrait",
      atBeyrouth: "A Beyrouth",
      viewMaps: "→ Voir sur Google Maps",
      totalHT: "Total HT",
      vat10: "TVA 10%",
      totalTTC: "Total TTC",
      yourOrderReady: "Votre commande vous attend",
      reminderReady: "Rappel : votre commande est prête au retrait.",
      orderAccepted: "Commande acceptée !",
      preparing: "En cours de préparation",
      pickupCode: "Votre code de retrait",
      showCounter: "À présenter au comptoir",
      readyFor: "Sera prête pour",
      viewRoute: "📍 Voir l'itinéraire",
      preparingCare: "🍽️ On prépare votre commande avec soin",
      questions: "Des questions ? contact@beyrouth.express",
      beyrouthDesc: "A Beyrouth · Cuisine libanaise authentique"
    },

    // Catering
    catering: {
      freeQuote: "Devis gratuit sous 48h",
      buffetsSubtitle: "Buffets sur mesure, préparés avec passion.",
      title: "Cuisine Libanaise<br>pour vos Événements",
      customBuffets: "Buffets personnalisés pour événements pro et privés",
      delivery: "Livraison et installation possible (La Défense & environs)",
      vegOptions: "Options végétariennes et vegan",
      pricing: "À partir de 18€/pers · Minimum 10 personnes",
      formIntro: "Remplissez ce formulaire et nous vous répondrons sous 48h avec un devis personnalisé",
      professional: "Événement professionnel",
      private: "Célébration privée",
      seminar: "Séminaire / Formation",
      cocktail: "Cocktail / Réception",
      answerIn48h: "Nous vous répondrons sous 48h avec un devis personnalisé",
      // Ajouts etape 6 (envoi du formulaire de devis)
      quoteSent: "Demande envoyée ! Vous recevrez un email de confirmation. Réponse sous 48h.",
      quoteSentBtn: "Demande envoyée ✓",
      quoteSending: "Envoi en cours...",
      quoteError: "Erreur lors de l'envoi. Veuillez réessayer ou nous contacter à traiteur@beyrouth.express"
    },

    // Form Labels
    form: {
      other: "Autre",
      choose: "-- Choisir --",
      name: "Votre nom",
      firstName: "Prénom",
      lastName: "Nom",
      email: "Email",
      phone: "Téléphone",
      company: "Nom de la société",
      eventType: "Type d'événement",
      guests: "Nombre de personnes",
      date: "Date de l'événement",
      message: "Votre message",
      submit: "Envoyer ma demande",
      generateInvoice: "Générer ma facture",
      enterOrderNumber: "Entrez votre numéro de commande"
    },

    // Validation du formulaire de commande (etape 6, bloc 2).
    // Textes copies a l identique depuis index.html : le francais ne change pas.
    // Les emojis restent dans le code appelant, pas dans le dictionnaire.
    validation: {
      firstNameRequired: "Entrez votre prénom",
      firstNameInvalid: "Prénom invalide (lettres uniquement, 2-50 car.)",
      phoneRequired: "Entrez votre téléphone",
      phoneInvalid: "Numéro invalide (ex: 0612345678 ou +33612345678)",
      emailRequired: "Email OBLIGATOIRE pour recevoir la confirmation",
      emailInvalid: "Email invalide (ex: nom@gmail.com)",
      pickupRequired: "Choisissez une heure de retrait",
      closedChooseOther: "Le restaurant est fermé. Choisissez un autre créneau."
    },

    // Erreurs de paiement montrees au client (etape 6, bloc 3).
    // Avant, le message BRUT de la base ou du reseau s affichait tel quel :
    // un client a pu lire « new row violates row-level security policy ».
    // Le detail technique part desormais dans la console, pas a l ecran.
    errors: {
      // Echec AVANT l ouverture du paiement : aucun debit possible, la
      // commande est supprimee dans la foulee. On peut donc rassurer.
      beforePayment: "Votre commande n'a pas pu être enregistrée. Vous n'avez pas été débité. Réessayez dans un instant, ou appelez-nous au 01 47 74 88 12.",
      // Echec PENDANT ou APRES le paiement : un debit a pu avoir lieu.
      // On ne promet donc jamais qu il n y a pas eu de debit.
      duringPayment: "Le paiement n'a pas abouti. Si votre compte a été débité, appelez-nous au 01 47 74 88 12 : nous régularisons immédiatement.",
      network: "Connexion interrompue. Vérifiez votre réseau et réessayez.",
      // Le paiement n a meme pas pu demarrer (ex. redirection carte restaurant
      // qui echoue avant de partir) : aucun debit, on propose l autre moyen.
      paymentStart: "Le paiement n'a pas pu démarrer. Vous n'avez pas été débité. Réessayez, ou réglez par carte bancaire."
    },

    // Tunnel de paiement (etape 6, bloc 3). Textes copies a l identique.
    payment: {
      secureLoading: "Chargement sécurisé...",
      sdkFailed: "Erreur de chargement du système de paiement, rechargez la page",
      declined: "Paiement refusé par votre banque",
      tooLong: "Le paiement prend trop de temps. Si vous avez validé, vérifiez votre commande dans quelques minutes.",
      checking: "Vérification du paiement...",
      checkTimeout: "Délai de vérification dépassé. Vérifiez vos emails.",
      confirmed: "Paiement confirmé !",
      cancelled: "Paiement annulé ou refusé",
      inProgress: "Vérification en cours... Vous recevrez un email de confirmation.",
      checkFailed: "Erreur de vérification. Contactez-nous si vous avez payé.",
      // Cartes restaurant (Edenred). Les horaires different selon l ecran :
      // ils sont repris tels quels, sans les uniformiser.
      mealCardWeekdaysHtml: "⏰ <strong>Les cartes restaurant sont acceptées du lundi au samedi de 11h30 à 22h00.</strong><br>Veuillez utiliser une carte bancaire.",
      mealCardHoursHtml: "⏰ <strong>Les cartes restaurant sont uniquement acceptées de 11h30 à 22h00.</strong><br>Veuillez utiliser une carte bancaire.",
      mealCardWeekdays: "Les cartes restaurant ne sont acceptées que du lundi au samedi de 11h30 à 21h00",
      mealCardHours: "Les cartes restaurant ne sont acceptées que de 11h30 à 21h00",
      // Ecrans d erreur du retour carte restaurant
      timeoutTitle: "Délai dépassé",
      timeoutMsg: "Le serveur de paiement ne répond pas.<br><br>Veuillez vérifier votre connexion et réessayer, ou utiliser une carte bancaire.",
      notAllowedTitle: "Paiement non autorisé",
      notAllowedMsg: "Les cartes restaurant ne peuvent être utilisées que <strong>du lundi au vendredi</strong>.<br><br>Merci de réessayer en semaine ou d'utiliser une carte bancaire.",
      limitTitle: "Limite dépassée",
      limitMsg: "Le montant dépasse la limite de votre carte restaurant.<br><br>Veuillez utiliser une carte bancaire.",
      unavailableTitle: "Service temporairement indisponible",
      unavailableMsg: "Le service de paiement Edenred est momentanément indisponible.<br><br>Veuillez réessayer dans quelques instants ou utiliser une carte bancaire.",
      errorTitle: "Erreur de paiement"
    },

    // Messages & Notifications
    messages: {
      orderNotFound: "Commande introuvable. Vérifiez le numéro.",
      invoiceGenerated: "✅ Facture générée",
      generatingInvoice: "📄 Génération de facture",
      emailConfirmSent: "Email de confirmation envoyé",
      enjoyMeal: "Bon appétit !",
      thankYou: "Merci et à bientôt !",
      detail: "Détail"
    },

    // Footer
    banner: {
      message: "Le four se repose, l'équipe aussi. Bel été à vous&nbsp;!",
      reopening: "Réouverture le lundi 31 août",
      closed: "Fermé pour congés",
    },
    footer: {
      leaveReview: "Laisser un avis",
      hours: "Click & collect 7j/7 · Retrait Lun-Ven 11h30-20h30",
      onlineService: "Service en ligne de A Beyrouth",
      address: "4 Esplanade du Général de Gaulle, 92400 Courbevoie",
      metro: "Sortie 4 du métro"
    }
  },

  en: {
    // SEO & Meta
    meta: {
      title: "Lebanese Restaurant La Défense - A Beyrouth | Click & Collect",
      description: "A Beyrouth Lebanese restaurant in La Défense Courbevoie. Order online: shawarma, mezze, grills, falafel. Express pickup 15 min. Restaurant vouchers accepted (Swile, Ticket Restaurant, Conecs).",
      ogTitle: "A Beyrouth · Lebanese Restaurant La Défense",
      ogDescription: "Authentic Lebanese cuisine in La Défense. Order online, pick up in 15 min. Restaurant vouchers accepted.",
      cuisine: "Lebanese",
      paymentMethods: "Credit card, Swile, Ticket Restaurant, Restoflash, Conecs"
    },

    // Header & Navigation
    nav: {
      orderNow: "Order Now",
      menu: "Menu",
      catering: "Catering",
      contact: "Contact"
    },

    // Timepicker & Pickup
    timepicker: {
      chooseSlot: "Choose a time slot",
      prep15min: "~15 min preparation",
      orChooseSlot: "or choose a time slot",
      pickupTime: "Pickup time",
      asap: "As soon as possible",
      nextSlot: "Next available slot",
      closesAt: "Closes at",
      open: "Open",
      // Step 6 additions (header status)
      closed: "Closed",
      tempClosure: "Temporarily closed",
      until: "until",
      // Hour separator: "20:30" in English, "20h30" in French.
      hourSep: ":"
    },


    // Days of the week, in getDay() order: 0 = Sunday.
    days: {
      sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
      thursday: "Thursday", friday: "Friday", saturday: "Saturday"
    },

    // Cart & Checkout
    cart: {
      placeOrder: "Place order",
      modify: "Edit",
      addToCart: "Add to cart",
      pickupTime: "Pickup time",
      yourOrder: "Your Order",
      empty: "Your cart is empty",
      add: "Add",
      remove: "Remove",
      total: "Total",
      subtotal: "Subtotal",
      optin: "Keep me informed of offers and promotions",
      securePayment: "Secure online payment (credit card, restaurant voucher)",
      payNow: "Pay Now",
      orderNow: "Order Now",
      // Ajouts etape 6 (bloc panier)
      tempClosed: "Click & collect is temporarily closed.\nReopening soon.",
      formulaAdded: "Meal deal added to cart!",
      drinkWithThat: "A drink with that?",
      removedUnavailable: (noms, pluriel) =>
        `${noms} ${pluriel ? 'are no longer available' : 'is no longer available'} and ${pluriel ? 'have' : 'has'} been removed from your cart`
    },

    // Menu Items
    menu: {
      loading: "Loading menu...",
      customize: "Customise your meal deal",
      soonAvailable: "Available soon",
      formula1: "Combo 1",
      formula1Desc: "sandwich + 2 pastries + drink",
      addDrink: "A refreshing drink with your meal?",
      from: "From"
    },

    // Order Status
    status: {
      paid: "Paid",
      paidDesc: "Order received and paid",
      accepted: "Accepted",
      acceptedDesc: "The restaurant accepted your order",
      preparing: "Preparing",
      preparingDesc: "Your order is being prepared",
      ready: "Ready!",
      readyDesc: "Come pick up your order",
      pickedUp: "Picked up",
      pickedUpDesc: "Enjoy your meal!",
      cancelled: "Cancelled"
    },

    // Confirmation Page
    confirmation: {
      backToMenu: "Back to menu",
      loading: "Loading your order...",
      title: "Order Confirmed | Beyrouth Express",
      paymentValidated: "Payment validated!",
      orderRegistered: "Your order has been registered",
      pickupTime: "Scheduled pickup",
      whereToPickup: "Where to pick up",
      address: "4 Esplanade du Général de Gaulle<br>92400 Courbevoie (La Défense)",
      metro: "Metro Exit 4 La Défense",
      examining: "The restaurant is reviewing your order.<br>You will receive an email upon confirmation.",
      emailSent: "Email sent",
      willNotify: "You will be notified upon confirmation",
      preparing: "Preparation in progress",
      readyAt: "Your order will be ready at",
      orderAccepted: "Order accepted",
      orderReady: "Your order is ready!",
      canPickup: "You can pick it up at the restaurant",
      commandReady: "Order ready!",
      pickupNow: "Come pick it up at A Beyrouth",
      seeyouSoon: "See you soon at A Beyrouth 🧆",
      // Step 6 additions (confirmation page)
      willConfirmSoon: "Your order will be confirmed in a moment",
      orderAcceptedExcl: "Order accepted!",
      beingPrepared: "Your order is being prepared",
      comePickUp: "Come and collect it",
      enjoyMeal: "Enjoy your meal!",
      orderPickedUp: "Order collected",
      thanksForOrder: "Thank you for your order!",
      thankYouSoon: "Thank you and see you soon!",
      orderCancelled: "Order cancelled",
      refundInProgress: "Refund in progress",
      refundDelay: "The refund will be processed within 5 to 7 business days.",
      cancellationEmailSent: "Cancellation email sent",
      autoRefresh: "This page updates automatically",
      asapLower: "as soon as possible",
      willBeReady: "Your order will be ready"
    },

    // Admin
    admin: {
      login: "Enter admin code to access",
      completedOrders: "Completed orders",
      noCompleted: "No completed orders",
      toggleDishes: "Enable/disable dishes individually. Changes are visible instantly to customers.",
      year: "Year",
      delaySlots: "⏸️ Delay slots:",
      untilTomorrow: "🌙 Until tomorrow",
      reminded: "📧 Reminded",
      asap: "⚡ ASAP",
      pickedUp: "📦 Picked up",
      completed: "✓ Completed",
      irreversible: "This action is irreversible.",
      spent: "spent",
      last: "last",
      totalSpent: "Total spent",
      favDishes: "🍽️ Favorite dishes"
    },

    // Emails
    email: {
      orderConfirmed: "Order confirmed",
      number: "Number",
      seeyouSoon: "See you soon!",
      paymentConfirmed: "Payment confirmed",
      paymentReceived: "✅ Payment received",
      secondEmail: "You will receive a second email with the summary once the restaurant has validated your order.",
      orderNumber: "Order number",
      scheduledTime: "Scheduled time",
      quoteReceived: "Request received",
      answerIn48h: "Answer within 48h",
      requestRegistered: "✅ Request registered",
      studyRequest: "Our team will review your request and send you a personalized quote within 48 hours.",
      summary: "Summary",
      eventType: "Event type",
      desiredDate: "Desired date",
      orderDetail: "Order details",
      pickupLocation: "Pickup location",
      atBeyrouth: "A Beyrouth",
      viewMaps: "→ View on Google Maps",
      totalHT: "Total excl. VAT",
      vat10: "VAT 10%",
      totalTTC: "Total incl. VAT",
      yourOrderReady: "Your order is waiting for you",
      reminderReady: "Reminder: your order is ready for pickup.",
      orderAccepted: "Order accepted!",
      preparing: "Being prepared",
      pickupCode: "Your pickup code",
      showCounter: "Show at the counter",
      readyFor: "Will be ready for",
      viewRoute: "📍 View route",
      preparingCare: "🍽️ We're preparing your order with care",
      questions: "Questions? contact@beyrouth.express",
      beyrouthDesc: "A Beyrouth · Authentic Lebanese cuisine"
    },

    // Catering
    catering: {
      freeQuote: "Free quote within 48 hours",
      buffetsSubtitle: "Bespoke buffets, prepared with care.",
      title: "Lebanese Cuisine<br>for Your Events",
      customBuffets: "Custom buffets for professional and private events",
      delivery: "Delivery and setup available (La Défense & surroundings)",
      vegOptions: "Vegetarian and vegan options",
      pricing: "From €18/person · Minimum 10 people",
      formIntro: "Fill out this form and we'll get back to you within 48h with a personalized quote",
      professional: "Professional event",
      private: "Private celebration",
      seminar: "Seminar / Training",
      cocktail: "Cocktail / Reception",
      answerIn48h: "We'll get back to you within 48h with a personalized quote",
      // Step 6 additions (quote form submission)
      quoteSent: "Request sent! You will receive a confirmation email. Reply within 48 hours.",
      quoteSentBtn: "Request sent \u2713",
      quoteSending: "Sending...",
      quoteError: "Sending failed. Please try again or contact us at traiteur@beyrouth.express"
    },

    // Form Labels
    form: {
      other: "Other",
      choose: "-- Choose --",
      name: "Your name",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      company: "Company name",
      eventType: "Event type",
      guests: "Number of guests",
      date: "Event date",
      message: "Your message",
      submit: "Send my request",
      generateInvoice: "Generate invoice",
      enterOrderNumber: "Enter your order number"
    },

    // Order form validation (step 6, block 2)
    validation: {
      firstNameRequired: "Enter your first name",
      firstNameInvalid: "Invalid first name (letters only, 2-50 characters)",
      phoneRequired: "Enter your phone number",
      phoneInvalid: "Invalid number (e.g. 0612345678 or +33612345678)",
      emailRequired: "Email REQUIRED to receive your confirmation",
      emailInvalid: "Invalid email (e.g. name@gmail.com)",
      pickupRequired: "Choose a pickup time",
      closedChooseOther: "The restaurant is closed. Please choose another time slot."
    },

    // Payment errors shown to the customer (step 6, block 3)
    errors: {
      beforePayment: "Your order could not be saved. You have not been charged. Please try again, or call us on +33 1 47 74 88 12.",
      duringPayment: "The payment did not go through. If your account was charged, call us on +33 1 47 74 88 12 and we will sort it out right away.",
      network: "Connection lost. Please check your network and try again.",
      paymentStart: "The payment could not be started. You have not been charged. Please try again, or pay by credit card."
    },

    // Payment flow (step 6, block 3)
    payment: {
      secureLoading: "Secure loading...",
      sdkFailed: "The payment system failed to load. Please reload the page.",
      declined: "Payment declined by your bank",
      tooLong: "The payment is taking too long. If you confirmed it, check your order in a few minutes.",
      checking: "Checking payment...",
      checkTimeout: "Verification timed out. Please check your emails.",
      confirmed: "Payment confirmed!",
      cancelled: "Payment cancelled or declined",
      inProgress: "Verification in progress... You will receive a confirmation email.",
      checkFailed: "Verification error. Contact us if you have paid.",
      mealCardWeekdaysHtml: "⏰ <strong>Luncheon vouchers are accepted Monday to Saturday, 11:30 to 22:00.</strong><br>Please use a credit card.",
      mealCardHoursHtml: "⏰ <strong>Luncheon vouchers are only accepted between 11:30 and 22:00.</strong><br>Please use a credit card.",
      mealCardWeekdays: "Luncheon vouchers are only accepted Monday to Saturday, 11:30 to 21:00",
      mealCardHours: "Luncheon vouchers are only accepted between 11:30 and 21:00",
      timeoutTitle: "Timed out",
      timeoutMsg: "The payment server is not responding.<br><br>Please check your connection and try again, or use a credit card.",
      notAllowedTitle: "Payment not allowed",
      notAllowedMsg: "Luncheon vouchers can only be used <strong>Monday to Friday</strong>.<br><br>Please try again on a weekday or use a credit card.",
      limitTitle: "Limit exceeded",
      limitMsg: "The amount exceeds your luncheon voucher limit.<br><br>Please use a credit card.",
      unavailableTitle: "Service temporarily unavailable",
      unavailableMsg: "The Edenred payment service is temporarily unavailable.<br><br>Please try again shortly or use a credit card.",
      errorTitle: "Payment error"
    },

    // Messages & Notifications
    messages: {
      orderNotFound: "Order not found. Check the number.",
      invoiceGenerated: "✅ Invoice generated",
      generatingInvoice: "📄 Generating invoice",
      emailConfirmSent: "Confirmation email sent",
      enjoyMeal: "Enjoy your meal!",
      thankYou: "Thank you and see you soon!",
      detail: "Details"
    },

    // Footer
    banner: {
      message: "The oven is resting, and so is the team. Have a great summer!",
      reopening: "Reopening Monday 31 August",
      closed: "Closed for holidays",
    },
    footer: {
      leaveReview: "Leave a review",
      hours: "Click & collect 7 days a week · Pickup Mon to Fri 11.30am to 8.30pm",
      onlineService: "Online service by A Beyrouth",
      address: "4 Esplanade du Général de Gaulle, 92400 Courbevoie",
      metro: "Metro Exit 4"
    }
  }
};

// État actuel de la langue
let currentLang = 'fr';

/**
 * Détecte la langue du navigateur
 */
function detectBrowserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  // Si c'est anglais (en, en-US, en-GB...), retourner 'en', sinon 'fr'
  return browserLang.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

/**
 * Initialise la langue au chargement
 */
function initLanguage() {
  // 1. Vérifier le localStorage (choix manuel)
  const savedLang = localStorage.getItem('beyrouth_lang');

  if (savedLang && (savedLang === 'fr' || savedLang === 'en')) {
    currentLang = savedLang;
  } else {
    // 2. Détection automatique navigateur
    // 11/08/2026 : on n ECRIT PLUS la langue detectee. Avant, un premier passage
    // avec un navigateur anglais figeait l anglais POUR TOUJOURS, comme si l on
    // avait clique. Seul un choix explicite (setLanguage) doit etre memorise.
    currentLang = detectBrowserLanguage();
  }

  return currentLang;
}

/**
 * Change la langue et recharge les traductions
 */
function setLanguage(lang) {
  if (lang !== 'fr' && lang !== 'en') return;

  currentLang = lang;
  localStorage.setItem('beyrouth_lang', lang);

  // Trigger event pour que les pages écoutent
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));

  // Appliquer les traductions
  applyTranslations();
}

/**
 * Retourne la langue actuelle
 */
function getCurrentLanguage() {
  return currentLang;
}

/**
 * Retourne une traduction par clé (ex: "cart.total")
 */
function t(key) {
  // FILET DE SECURITE (11/08/2026) : une cle manquante affichait la CLE TECHNIQUE
  // a l ecran (un visiteur anglais aurait lu "cart.total" a la place de son total).
  // Desormais on retombe sur le FRANCAIS, qui est toujours complet : au pire un
  // fragment reste en francais, jamais de texte casse. C est la condition pour
  // pouvoir activer le bilingue sans risque.
  function lire(dict) {
    let v = dict;
    for (const k of key.split('.')) {
      if (v && typeof v === 'object') v = v[k];
      else return undefined;
    }
    // 11/08/2026 : les fonctions sont acceptees. Certains messages dependent du
    // pluriel ou d un montant (ex. « X n est plus disponible » / « X ne sont plus
    // disponibles ») : sans cela t() les rejetait et affichait la CLE a l ecran.
    return (typeof v === 'string' || typeof v === 'number' || typeof v === 'function') ? v : undefined;
  }
  const val = lire(translations[currentLang]);
  if (val !== undefined) return val;
  const fr = lire(translations.fr);          // repli systematique sur le francais
  if (fr !== undefined) {
    if (currentLang !== 'fr' && typeof console !== 'undefined' && console.debug) {
      console.debug('[i18n] traduction manquante (' + currentLang + ') : ' + key);
    }
    return fr;
  }
  return key;                                 // ni traduit ni en francais : cas impossible en pratique
}

/**
 * Applique les traductions aux éléments data-i18n
 */
function applyTranslations() {
  // Traduire les éléments avec data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);

    if (el.hasAttribute('data-i18n-placeholder')) {
      el.placeholder = translation;
    } else if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = translation;
    } else {
      el.textContent = translation;
    }
  });

  // Mettre à jour le HTML lang
  document.documentElement.lang = currentLang;

  // Mettre à jour les meta tags
  // 11/08/2026 : NE PLUS ecraser le titre ni la meta description par defaut.
  // Ces 3 lignes s appliquaient a TOUTE page chargeant ce fichier, sans balise :
  //   · l accueil « Restaurant Libanais La Defense - A Beyrouth | Click & Collect »
  //     devenait « A Beyrouth · Restaurant Libanais La Defense | ... » ;
  //   · la page TRAITEUR perdait son propre titre « Traiteur Libanais La Defense »
  //     au profit de celui de l accueil : perte seche de referencement sur la
  //     requete « traiteur libanais la defense ».
  // Desormais il faut que la page le demande, en declarant sa PROPRE cle :
  //   <html lang="fr" data-i18n-title="meta.title" data-i18n-desc="meta.description">
  // Aucune page ne le fait aujourd hui -> title et meta restent intacts.
  const racine = document.documentElement;
  const cleTitre = racine && racine.getAttribute && racine.getAttribute('data-i18n-title');
  if (cleTitre) document.title = t(cleTitre);
  const cleDesc = racine && racine.getAttribute && racine.getAttribute('data-i18n-desc');
  if (cleDesc) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t(cleDesc);
  }
}

// Export pour utilisation dans les autres scripts
window.i18n = {
  init: initLanguage,
  set: setLanguage,
  get: getCurrentLanguage,
  t: t,
  apply: applyTranslations,
  translations: translations
};
