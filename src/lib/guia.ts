// Contenido de la Guía «¿Primera vez en Pucallpa?». Un solo lugar: lo pinta la página (/guia) y lo leen, en el HTML del servidor,
// los datos estructurados de preguntas y respuestas (guia/layout.tsx) para buscadores e IAs.

// Fotos reales de Wikimedia Commons (uso libre), no de bancos de stock —
// verificadas una por una porque los IDs de Unsplash "a ojo" salieron mal
// (fotos que no tenían nada que ver con el lugar).
// Cada tarjeta abre su artículo completo en Revista (categoría "Rutas"),
// no un link externo — son preview/miniatura de esa nota.
export const QUE_VISITAR = [
  {
    slug: 'laguna-de-yarinacocha-la-joya-de-pucallpa',
    titulo: 'Laguna de Yarinacocha',
    desc: 'La joya de Pucallpa: paseo en bote, artesanía shipibo-conibo y las mejores puestas de sol.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Laguna_de_Yarinacocha_desde_un_bote_01.jpg/500px-Laguna_de_Yarinacocha_desde_un_bote_01.jpg',
  },
  {
    slug: 'plaza-de-armas-el-punto-de-partida-del-centro',
    titulo: 'Plaza de Armas',
    desc: 'El corazón de la ciudad, punto de partida para conocer el centro a pie.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Plaza_de_Armas_de_Pucallpa%2C_Per%C3%BA.jpg/500px-Plaza_de_Armas_de_Pucallpa%2C_Per%C3%BA.jpg',
  },
  {
    slug: 'catedral-virgen-de-la-inmaculada',
    titulo: 'Catedral Virgen de la Inmaculada',
    desc: 'El templo principal de Pucallpa, frente a la Plaza de Armas.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/La_catedral_de_Pucallpa_2022.jpg/500px-La_catedral_de_Pucallpa_2022.jpg',
  },
  {
    slug: 'museo-agustin-rivas-vasquez-el-picasso-de-la-amazonia',
    titulo: 'Museo Agustín Rivas Vásquez',
    desc: 'Esculturas en madera del "Picasso de la Amazonía", tallada de raíces y troncos.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Pucallpa1.JPG/500px-Pucallpa1.JPG',
  },
  {
    slug: 'plaza-del-reloj-publico-el-punto-de-encuentro-clasico',
    titulo: 'Plaza del Reloj Público',
    desc: 'Punto de encuentro clásico, con el reloj más reconocible de la ciudad.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Reloj_publico_pucallpa_2022.jpg/500px-Reloj_publico_pucallpa_2022.jpg',
  },
  {
    slug: 'parque-natural-de-pucallpa-fauna-amazonica-de-cerca',
    titulo: 'Parque Natural y Museo Regional',
    desc: 'Fauna amazónica de cerca y piezas de la historia de Ucayali, en un mismo lugar.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Puente_central_del_Parque_Natural_de_Pucallpa.jpg/500px-Puente_central_del_Parque_Natural_de_Pucallpa.jpg',
  },
  {
    slug: 'laguna-cashibococha-la-alternativa-tranquila-a-yarinacocha',
    titulo: 'Laguna Cashibococha',
    desc: 'Más tranquila que Yarinacocha, ideal para pasar el día en familia.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Cashibo_cocha.jpg/500px-Cashibo_cocha.jpg',
  },
  {
    slug: 'usko-ayar-el-taller-de-pablo-amaringo-hoy-escuela-de-pintura',
    titulo: 'Casa "Usko Ayar" de Pablo Amaringo',
    desc: 'El taller del maestro del arte visionario shipibo, hoy escuela de pintura.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Hanna_jon_2002_amaringo_pablo.jpg/500px-Hanna_jon_2002_amaringo_pablo.jpg',
  },
];

export const TEMAS = [
  {
    id: 'clima', icon: 'thermostat', titulo: 'Clima y qué llevar', pregunta: '¿Cómo es el clima en Pucallpa y qué debo llevar?',
    parrafos: [
      'Pucallpa es cálida y húmeda todo el año, entre 28 y 34 °C. Llueve más fuerte de octubre a abril, casi siempre en chaparrones cortos e intensos.',
      'Lleva ropa ligera, sandalias, bloqueador, repelente y una sombrilla o poncho. Un abrigo fino solo lo vas a necesitar en el avión o en las noches raras de "friaje".',
    ],
  },
  {
    id: 'plata', icon: 'payments', titulo: 'Plata: efectivo, Yape y cajeros', pregunta: '¿Se paga con efectivo, Yape o tarjeta en Pucallpa? ¿Hay cajeros?',
    parrafos: [
      'El efectivo en soles manda, sobre todo para el mototaxi y los mercados. Ten siempre sencillo a la mano.',
      'Yape y Plin se aceptan en muchos negocios; la tarjeta, solo en tiendas grandes y restaurantes formales. Hay cajeros de los principales bancos en el centro y en Yarinacocha. Cambia dólares en casas de cambio, no en la calle.',
    ],
  },
  {
    id: 'emergencias', icon: 'emergency', titulo: 'Emergencias y salud', pregunta: '¿Cuáles son los números de emergencia en Pucallpa y dónde hay hospitales?',
    parrafos: [
      'Números nacionales: Policía 105 · Bomberos 116 · Ambulancia (SAMU) 106. El serenazgo cambia según el distrito (Callería, Yarinacocha o Manantay).',
      'Para atención está el Hospital Regional de Pucallpa y el Hospital Amazónico en Yarinacocha. En el centro hay farmacias de turno las 24 horas.',
    ],
  },
  {
    id: 'llegar', icon: 'flight_land', titulo: 'Cómo llegar y moverte', pregunta: '¿Cómo llegar a Pucallpa y cómo moverse dentro de la ciudad?',
    parrafos: [
      'El aeropuerto está a unos 5 minutos del centro; hay vuelos diarios desde Lima (alrededor de 1 hora). Por tierra, los buses desde Lima vía Tingo María toman entre 18 y 20 horas.',
      'Dentro de la ciudad: mototaxi para trayectos cortos —pregunta el precio antes de subir— y colectivos al puerto de Yarinacocha desde el centro. Con BogaHub pides Taxi Seguro con chofer verificado.',
    ],
  },
  {
    id: 'costumbres', icon: 'diversity_3', titulo: 'Costumbres y palabras locales', pregunta: '¿Qué costumbres, comidas y palabras locales conviene conocer en Pucallpa?',
    parrafos: [
      'El almuerzo es la comida fuerte del día y muchos negocios cierran entre la 1 y las 3 de la tarde. La propina no es obligatoria: se redondea.',
      '"Charapa" es la persona de la selva y se dice con orgullo. En la carta vas a ver juane, tacacho con cecina, inchicapi y patarashca; para tomar, aguajina, chapo o el clásico RC.',
    ],
  },
];
