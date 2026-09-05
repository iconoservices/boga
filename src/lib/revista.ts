// Datos y helpers de la Revista ("Yo Soy de la Selva") — módulo compartido para
// que la portada (/revista) y cada artículo (/revista/[slug]) lean la misma
// fuente. Sin "use client": lo importan tanto Server como Client Components.
// Contenido compilado por el equipo de Boga a partir de fuentes públicas
// (pucallpa.com, Wikipedia) con fotos de Wikimedia Commons acreditadas.

export const EDICION = 'Edición 07 · Septiembre 2026';

// Secciones = categorías del blog. "Portada" es la vista curada; el resto filtra.
export const SECCIONES = ['Actualidad', 'Cultura', 'Lifestyle', 'Vida Social', 'Gastronomía', 'Naturaleza', 'Rutas'] as const;

export type Nota = {
  id: string;
  kicker: string;
  titulo: string;
  dek: string;
  autor: string;
  fecha: string;
  lectura: string;
  img: string;
  /** Por defecto dice "archivo Boga" — sobreescribir cuando la foto es real (ej. Wikimedia Commons). */
  imgCredito?: string;
  cuerpo: string[];
  cita?: { texto: string; autor: string };
  /** Si la nota es sobre un lugar puntual, un botón "Cómo llegar" a Google Maps. */
  ubicacionMaps?: string;
  /** Fuente principal del texto (dato compilado, reescrito con voz propia). */
  fuente?: { nombre: string; url?: string };
  destacado?: boolean;
  portada?: boolean;
};

export const NOTAS: Nota[] = [
  {
    id: 'n19', kicker: 'Naturaleza',
    titulo: 'El río que hierve: Shanay-timpishka, a un viaje de Pucallpa',
    dek: 'Hasta 90 °C de agua en plena selva, sin un volcán a menos de 700 km. Los asháninka lo consideran sagrado; la ciencia todavía lo estudia.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '4 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Boiling_River_%26_Ashaninka_shaman_Maestro_Juan_Flores_PC_Sof%C3%ADa_Ruzo.jpg/500px-Boiling_River_%26_Ashaninka_shaman_Maestro_Juan_Flores_PC_Sof%C3%ADa_Ruzo.jpg',
    imgCredito: 'Foto: Wikimedia Commons (el maestro asháninka Juan Flores en el río hirviente)',
    ubicacionMaps: 'Mayantuyacu, río hirviente, Honoria, Huánuco, Perú',
    fuente: { nombre: 'nomades.com', url: 'https://www.nomades.com/blog/lugares-turisticos-pucallpa/' },
    cuerpo: [
      'El Shanay-timpishka —"hervido con el calor del sol" en quechua— es un tramo de unos 6,4 km de un afluente del río Pachitea donde el agua llega a los 86–90 °C, y en algunos puntos cerca de los 100. Está en el distrito de Honoria, en la selva de Huánuco, a pocos kilómetros del límite con Ucayali, y se visita desde Pucallpa: bus hacia la zona de La Honoria, bote desde el puerto y cerca de una hora de caminata.',
      'Lo raro es que no hay ningún volcán cerca: el más próximo está a unos 700 km. El geocientífico peruano Andrés Ruzo, que lo estudia desde 2011 con permiso de un curandero local, lo explica como agua de lluvia que se infiltra, se calienta en profundidad por el gradiente geotérmico y vuelve a salir por fallas. Para las comunidades asháninka de Mayantuyacu el río es sagrado y medicinal, y el acceso pasa por el centro de curación del maestro Juan Flores.',
    ],
  },
  {
    id: 'n20', kicker: 'Naturaleza',
    titulo: 'Parque Nacional Cordillera Azul: el muro verde detrás del Boquerón',
    dek: 'Más de 13.000 km² de selva de montaña entre cuatro regiones. Solo en aves se han contado más de 500 especies.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Vista_Panoramica_del_Parque_Nacional_Cordillera_Azul.jpg/500px-Vista_Panoramica_del_Parque_Nacional_Cordillera_Azul.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    ubicacionMaps: 'Parque Nacional Cordillera Azul, Perú',
    fuente: { nombre: 'nomades.com', url: 'https://www.nomades.com/blog/lugares-turisticos-pucallpa/' },
    cuerpo: [
      'La Cordillera Azul es la cadena de montañas bajas cubiertas de selva que se ve al oeste de Pucallpa, camino a Tingo María — la misma que el Boquerón del Padre Abad corta en dos. El parque nacional que la protege, creado en 2001, reparte más de 13.000 km² entre Loreto, San Martín, Huánuco y Ucayali, lo que lo hace uno de los más grandes del país.',
      'Es un refugio de biodiversidad todavía poco explorado: se han registrado más de 500 especies de aves, además de mamíferos como el oso de anteojos y el mono choro, y varias especies nuevas para la ciencia descritas recién en los últimos años. No es un destino para improvisar: el ingreso es restringido y se hace con operadores autorizados.',
    ],
  },
  {
    id: 'n13', kicker: 'Cultura',
    fuente: { nombre: 'pucallpa.com', url: 'https://www.pucallpa.com/pucallpa/mitos-y-leyendas-de-la-selva.php' },
    titulo: 'Chullachaqui, yacumama y ayaymama: el bestiario que cuida (y asusta) la selva',
    dek: 'No son cuentos para niños: funcionan como un código de conducta. Cada criatura marca un límite —el monte, la cocha, la noche— que más vale respetar.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '5 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/El_Chullachaqui_-_Quistococha_%28Iquitos%2C_Peru%29.jpg/500px-El_Chullachaqui_-_Quistococha_%28Iquitos%2C_Peru%29.jpg',
    imgCredito: 'Foto: Wikimedia Commons (letrero del chullachaqui en el parque Quistococha, Iquitos — imagen referencial)',
    cuerpo: [
      'El chullachaqui es el más conocido: un duende que toma la forma de un familiar o de un animal para meter al viajero monte adentro hasta perderlo. Se lo reconoce por los pies desiguales —uno humano y otro de cabra o de venado—, así que la costumbre al caminar es mirar siempre las huellas. La yacumama, la "madre del agua", es una serpiente enorme que vive en las cochas de aguas quietas: la leyenda dice que cuando alguien ajeno se acerca a una laguna encantada, una tormenta repentina vuelca la canoa y el que cae ya no vuelve.',
      'La lista sigue: el yacuruna, un hombre del río que se lleva mujeres a vivir en el fondo; la yara, una sirena de formas perfectas que seduce a los pescadores; el bufeo colorado, el delfín de río al que se le atribuyen poderes para la brujería; y la ayaymama, un ave nocturna cuyo canto lastimero se explica como el llanto de niños abandonados en el bosque. Distintos personajes, la misma función: poner reglas sobre dónde entrar, a qué hora y con cuánto respeto.',
    ],
  },
  {
    id: 'n14', kicker: 'Gastronomía',
    fuente: { nombre: 'pucallpa.com', url: 'https://www.pucallpa.com/turismo/gastronomia.php' },
    titulo: 'Patarashca: el pescado que se cocina envuelto en su propia hoja',
    dek: 'Pescado de río, ajíes y hierbas dentro de una hoja de bijao, todo a la brasa. La envoltura no es adorno: hace de olla.',
    autor: 'Redacción Boga', fecha: '04 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Patarashca_en_hoja_de_bijao.jpg/500px-Patarashca_en_hoja_de_bijao.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'La patarashca es pescado de río —boquichico, palometa o tilapia— sazonado con ají dulce, cebolla, tomate y hierbas de la zona como el sacha culantro, envuelto en una o varias hojas de bijao y asado directamente sobre las brasas. La hoja sella el vapor: el pescado se cocina en su propio jugo y sale húmedo, con un perfume ahumado que la sartén no da.',
      'Es uno de los platos más antiguos de la Amazonía y comparte con el juane la misma técnica prehispánica de cocinar envuelto en hojas. Se come con las manos, abriendo el paquete recién salido del fuego, casi siempre con plátano asado o fariña al costado.',
    ],
  },
  {
    id: 'n15', kicker: 'Gastronomía',
    fuente: { nombre: 'pucallpa.com', url: 'https://www.pucallpa.com/turismo/gastronomia.php' },
    titulo: 'Masato: la bebida de yuca fermentada que se pasa de mano en mano',
    dek: 'Yuca cocida, machacada y dejada fermentar unos días. En las comunidades shipibo es lo primero que se le ofrece a una visita.',
    autor: 'Redacción Boga', fecha: '04 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Bebida_tradicional_en_la_selva_peruana%2C_el_masato.jpg/500px-Bebida_tradicional_en_la_selva_peruana%2C_el_masato.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'El masato se prepara con yuca sancochada y machacada que se deja fermentar en una vasija durante días; según el tiempo de reposo va de dulce y espeso a francamente alcohólico. La receta tradicional masca una parte de la masa antes de fermentar, porque la saliva ayuda a arrancar el proceso, aunque hoy muchas familias usan camote o azúcar en su lugar.',
      'Más que una bebida es un gesto social: en las comunidades shipibo-konibo se sirve un tazón al visitante apenas llega, y rechazarlo se toma como un desaire. Aparece en fiestas, mingas y faenas comunales, donde una sola vasija circula por toda la ronda.',
    ],
  },
  {
    id: 'n16', kicker: 'Naturaleza',
    titulo: 'El aguaje: la palmera que aguanta el pantano y llena los mercados',
    dek: 'De su fruto sale la aguajina, las paletas y hasta helados. El aguajal donde crece es, además, una esponja de carbono.',
    autor: 'Redacción Boga', fecha: '03 sep 2026', lectura: '4 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Fruto_de_aguaje_%28Mauritia_flexuosa%29.jpg/500px-Fruto_de_aguaje_%28Mauritia_flexuosa%29.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'El aguaje (Mauritia flexuosa) es una palmera que crece en suelos inundados —los aguajales—, donde casi ninguna otra planta prospera. Su fruto, de escamas rojizas y pulpa anaranjada, se come tal cual, se bate con agua y azúcar para hacer aguajina, y se congela en paletas; en Pucallpa se vende por baldes en cualquier esquina.',
      'El problema es cómo se cosecha: lo más rápido es tumbar la palmera entera para bajar los racimos, y como solo las hembras dan fruto, la tala desbalancea el aguajal. Por eso varias asociaciones locales promueven la cosecha con subida —trepar la palmera con un arnés— para dejar el árbol en pie. Los aguajales, encima, guardan enormes cantidades de carbono en su suelo turboso.',
    ],
  },
  {
    id: 'n17', kicker: 'Rutas',
    fuente: { nombre: 'pucallpa.com', url: 'https://www.pucallpa.com/ucayali/provincia-de-padre-abad.php' },
    titulo: 'El puente de Aguaytía: 850 metros que en 1942 fueron récord del Perú',
    dek: 'A 172 km de Pucallpa, sobre la carretera a Tingo María. Cuando se inauguró era el puente más largo del país.',
    autor: 'Redacción Boga', fecha: '03 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Puente_de_Aguayt%C3%ADa.jpg/500px-Puente_de_Aguayt%C3%ADa.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    ubicacionMaps: 'Puente de Aguaytía, Padre Abad, Ucayali, Perú',
    cuerpo: [
      'El puente colgante de Aguaytía cruza el río del mismo nombre a unos 172 km de Pucallpa, sobre la carretera Federico Basadre que conecta la ciudad con Tingo María y la sierra. Sus 850 metros lo convirtieron, al inaugurarse en 1942, en el puente más largo del Perú; para la ocasión se construyó incluso un hotel de turistas en el pueblo.',
      'Aguaytía, capital de la provincia de Padre Abad, nació como caserío en 1914 y hoy es parada obligada para todo el que sube o baja por tierra. El nombre viene del shipibo "shuaytia", un ave negra nocturna. A pocos kilómetros está el Boquerón del Padre Abad, así que muchos juntan las dos paradas en el mismo viaje.',
    ],
  },
  {
    id: 'n18', kicker: 'Cultura',
    fuente: { nombre: 'pucallpa.com', url: 'https://www.pucallpa.com/pucallpa/historia-de-pucallpa.php' },
    titulo: '"Tierra roja": de dónde viene el nombre de Pucallpa',
    dek: 'Del quechua puka allpa, por el color de la arcilla del suelo. Los shipibo la llamaban antes May Yushin, "tierra de espíritus".',
    autor: 'Redacción Boga', fecha: '03 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/R%C3%ADo_Ucayali_en_el_malec%C3%B3n_Grau_%2804-09-10%29.jpg/500px-R%C3%ADo_Ucayali_en_el_malec%C3%B3n_Grau_%2804-09-10%29.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'Pucallpa viene de las palabras quechuas "puka" (rojo) y "allpa" (tierra): "tierra roja", por el tono de la arcilla del suelo. Antes de la llegada de los misioneros, los shipibo-konibo llamaban a la zona "May Yushin", que suele traducirse como "tierra de espíritus" o "de demonios", quizá por los frecuentes enfrentamientos entre pueblos en ese territorio.',
      'La ciudad creció durante el auge del caucho, alrededor de una población shipibo que ya vivía a orillas del Ucayali. En 1943 se convirtió en capital de la provincia de Coronel Portillo, entonces parte de Loreto, y en 1982, al crearse el departamento de Ucayali, pasó a ser capital regional. Hoy es la segunda ciudad más importante de la Amazonía peruana, después de Iquitos.',
    ],
  },
  {
    id: 'n3', destacado: true, kicker: 'Vida Social',
    titulo: 'La Feria de Emprendedores toma el bulevar de Yarinacocha',
    dek: 'La municipalidad distrital organiza ferias periódicas en el bulevar turístico, con decenas de stands de negocios locales.',
    autor: 'Redacción Boga', fecha: '01 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Feria_Artesanal_por_el_Mes_Patrio%2C%2C_estudiantes_observando_las_l%C3%ADneas_shipibas.jpg/500px-Feria_Artesanal_por_el_Mes_Patrio%2C%2C_estudiantes_observando_las_l%C3%ADneas_shipibas.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'La Municipalidad Distrital de Yarinacocha organiza con cierta frecuencia ferias de emprendedores en su bulevar turístico, a orillas de la laguna. Una de las más recientes, en julio, reunió cerca de 90 stands con plantas, librería, decoración, bisutería, productos de belleza y ropa.',
      'Este tipo de ferias se suma a eventos más grandes de la región, como la ExpoAmazónica —el encuentro más importante de la Amazonía peruana, que se realiza en el Campo Ferial de Yarinacocha y reúne a productores y emprendedores de toda la selva— o "Cómprale a Ucayali", enfocada en emprendedores agroindustriales y artesanos durante el Carnaval.',
    ],
  },
  {
    id: 'n4', portada: true, destacado: true, kicker: 'Actualidad',
    titulo: 'El bulevar de Yarinacocha: la megaobra que cambió la cara del malecón',
    dek: 'S/ 144 millones de inversión, 6 canchas de fútbol de extensión y un muelle turístico a orillas de la laguna.',
    autor: 'Redacción Boga', fecha: '31 ago 2026', lectura: '4 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Boulevard_yarinacocha_julio_2024.jpg/500px-Boulevard_yarinacocha_julio_2024.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'El Bulevar de Yarinacocha es una de las obras turísticas más grandes que ha tenido la región en los últimos años: 24,061 m² (unas seis canchas de fútbol) sobre la orilla de la laguna, con malecón, muelle turístico, muelle artesanal para carga y descarga de productos, un mirador con cafetería y sala de interpretación, y un edificio para la autoridad portuaria.',
      'La obra, con una inversión de S/ 144 millones, fue ejecutada por el Plan COPESCO Nacional y transferida a la Municipalidad Distrital de Yarinacocha antes del Foro APEC 2024. Hoy es el escenario habitual de ferias, conciertos y el paseo de siempre al atardecer.',
    ],
  },
  {
    id: 'n5', kicker: 'Gastronomía',
    titulo: 'Tacacho con cecina: por qué se llama así y qué lo hace especial',
    dek: 'El nombre viene del quechua "lo golpeado". La base es siempre la misma: plátano bellaco asado y machacado.',
    autor: 'Redacción Boga', fecha: '30 ago 2026', lectura: '4 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Tacacho_con_cecina.jpg/500px-Tacacho_con_cecina.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'El tacacho se prepara con plátano bellaco verde —grande, duro y sin sabor si se come crudo— asado a las brasas (en algunas zonas, como Huánuco, se cocina en agua) y luego machacado junto con manteca de cerdo. Su nombre viene del quechua "taka chu", "lo golpeado", justo por ese proceso de machacado.',
      'La versión más conocida se sirve con dos bolas de tacacho, una pieza de cecina de cerdo y una de chorizo, aunque la proporción varía según el pedido. Es típico de Loreto, Ucayali y San Martín, y se vuelve casi omnipresente durante la Fiesta de San Juan, a fines de junio.',
    ],
  },
  {
    id: 'n6', kicker: 'Cultura',
    titulo: 'El kené shipibo no es un adorno, es un idioma',
    dek: '"Kené" significa "diseño" en shipibo-konibo: patrones geométricos que representan caminos entre el mundo físico y el espiritual.',
    autor: 'Redacción Boga', fecha: '29 ago 2026', lectura: '4 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Textiler%C3%ADa_shipiba_en_pucalla.jpg/500px-Textiler%C3%ADa_shipiba_en_pucalla.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'El kené es el sistema de diseños geométricos —líneas entrelazadas, rombos, espirales— que el pueblo shipibo-konibo pinta o borda sobre cerámica, madera, cuerpo y textiles (cuando el diseño se borda en tela, se le llama "kewé"). No es decoración: los diseños están inspirados en visiones chamánicas y representan el "cano" o camino, el vínculo entre el mundo físico y el espiritual.',
      'Hacer kené es tradicionalmente un arte femenino: son las mujeres shipibo-konibo quienes bordan los mantos y adornan los objetos del hogar. Un manto complejo puede tomar hasta tres meses de trabajo. Desde abril de 2008, el kené es Patrimonio Cultural de la Nación.',
    ],
  },
  {
    id: 'n7', destacado: true, kicker: 'Naturaleza',
    titulo: 'Boquerón del Padre Abad: el cañón de casi 70 cascadas',
    dek: 'A un par de horas de Pucallpa, el Velo de la Novia cae 101 metros en dos saltos. La Ducha del Diablo la descubrió un misionero en 1757.',
    autor: 'Redacción Boga', fecha: '28 ago 2026', lectura: '4 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Velo_de_la-novia_de_pucallpa.jpg/500px-Velo_de_la-novia_de_pucallpa.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    ubicacionMaps: 'Boquerón del Padre Abad, Aguaytía, Ucayali, Perú',
    cuerpo: [
      'El Boquerón del Padre Abad es un cañón angosto en la Cordillera Azul, a unos 183 km de Pucallpa (22 km desde Aguaytía), con cerca de 70 caídas de agua cristalina a lo largo de su extensión. La más conocida es el Velo de la Novia: 101 metros de altura en dos saltos —uno de 17 m y otro de 84 m—, angosta como un tubo al inicio y abierta hasta unos 5 metros de ancho en la base, con forma de velo de novia.',
      'La Ducha del Diablo destaca por tener el mayor caudal de todas. La descubrió el padre Abad en 1757, y le puso ese nombre por una formación rocosa con apariencia de rostro demoníaco donde cae el agua. Todo el cañón es un destino clásico para quienes salen de Pucallpa un fin de semana.',
    ],
  },
  {
    id: 'n8', kicker: 'Rutas',
    titulo: 'Fin de semana barato: Pucallpa a Contamana en lancha',
    dek: 'Cuánto cuesta, dónde dormir y qué llevar para bajar el río sin gastar de más.',
    autor: 'Redacción Boga', fecha: '27 ago 2026', lectura: '7 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Amazon_River_Taxi.jpg/500px-Amazon_River_Taxi.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'La lancha rápida sale del puerto de Pucallpa por la mañana y hace el tramo en unas seis horas; el "deslizador" lento cuesta la mitad pero se toma el doble de tiempo. Presupuesto realista para dos días: pasaje ida y vuelta, hospedaje sencillo y comida, todo por debajo de 180 soles por persona.',
      'En Contamana no te pierdas los baños termales de Agua Caliente y el mirador del cerro. Llevar efectivo (los cajeros fallan seguido), repelente y una muda extra: en el río siempre te mojas más de lo que crees.',
    ],
  },
  {
    id: 'n10', kicker: 'Gastronomía',
    titulo: 'Juane: por qué este plato tiene fecha propia en el calendario',
    dek: 'De técnica prehispánica a plato insignia de la Fiesta de San Juan, cada 24 de junio en toda la Amazonía peruana.',
    autor: 'Redacción Boga', fecha: '25 ago 2026', lectura: '4 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Juane%2C_plato_emblema_de_la_selva_del_Per%C3%BA.jpg/500px-Juane%2C_plato_emblema_de_la_selva_del_Per%C3%BA.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'El juane se originó en Moyobamba como un guiso de gallina envuelto en hojas de bijao, pero la técnica es mucho más vieja: viene del "huanar" o "huanti", el método prehispánico de cocinar alimentos envueltos en hojas, al fuego o al vapor. Una teoría dice que los misioneros lo bautizaron en honor a San Juan Bautista, patrón de la Amazonía, y que su forma redonda recuerda la cabeza del santo tras la decapitación bíblica.',
      'La Fiesta de San Juan, el 24 de junio, llegó a la selva con los conquistadores españoles y se mezcló con el Inti Raymi y otros rituales prehispánicos. Hoy se celebra en Loreto, San Martín, Ucayali, Madre de Dios y también en Tingo María, Oxapampa, Chanchamayo y Satipo — y el juane es, en todas partes, el plato del día.',
    ],
  },
  {
    id: 'n11', kicker: 'Cultura',
    titulo: '¿Por qué Yarinacocha se llama así? La respuesta está en el shipibo',
    dek: 'Yarina + cocha: dos palabras que explican la laguna y a la gente que vive de ella.',
    autor: 'Redacción Boga', fecha: '24 ago 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Laguna_Yarinacocha.jpg/500px-Laguna_Yarinacocha.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      '"Cocha" es laguna en quechua; "yarina" es la palmera —de la familia de las arecáceas, también llamada tagua o marfil vegetal— usada tradicionalmente para techar casas. En shipibo-konibo la laguna se llama "jepe ian", que también significa "laguna de las yarinas". Es, en las dos lenguas, el mismo nombre para lo mismo: la abundancia histórica de esa palmera en la zona.',
      'La laguna en sí es un antiguo meandro del río Ucayali que quedó aislado, con forma de herradura. Ese origen explica su ecología —aguas quietas, mucha vegetación flotante— y por qué las comunidades shipibo se asentaron en sus orillas: laguna tranquila, tierra firme cerca y salida al río cuando hace falta.',
    ],
  },
  {
    id: 'n12', kicker: 'Actualidad',
    titulo: 'Mototaxi en Pucallpa: cómo funciona el transporte que mueve la ciudad',
    dek: 'Sin buses ni metro, el motocarro de tres ruedas es el transporte público estándar. Esto es lo que hay que saber para usarlo.',
    autor: 'Redacción Boga', fecha: '23 ago 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Jir%C3%B3n_Sucre_Pucallpa.jpg/500px-Jir%C3%B3n_Sucre_Pucallpa.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'En Pucallpa, la gran mayoría del transporte público se mueve en "motocar" o mototaxi: los taxis de tres ruedas típicos de la selva peruana, junto con Iquitos y Puerto Maldonado. Las tarifas dentro de la ciudad suelen rondar los 3 soles y varían según distancia, zona y hora — lo normal es acordar el precio con el chofer antes de subir, no después.',
      'El servicio está regulado a nivel nacional por la Ley 31917, que fija derechos, obligaciones y requisitos para el transporte público en vehículos menores; cada mototaxi necesita un permiso de operación otorgado por la municipalidad distrital donde trabaja.',
    ],
  },
  {
    id: 'n2', kicker: 'Lifestyle',
    titulo: 'Cómo cuidar la piel en un clima cálido y húmedo',
    dek: 'Menos capas, no más: hidratación y protector solar bien aplicados rinden más que una rutina cargada en climas como el de Pucallpa.',
    autor: 'Redacción Boga', fecha: '02 sep 2026', lectura: '4 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Person_applies_cream_for_skin_from_a_jar_closeup.jpg/500px-Person_applies_cream_for_skin_from_a_jar_closeup.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'En clima húmedo, la regla general es contraintuitiva: menos capas de producto, no más. Un limpiador suave, un sérum ligero por la mañana y protector solar reaplicado al mediodía suelen rendir más que una rutina cargada que termina derritiéndose con el calor.',
      'La constancia importa más que los productos caros: hidratarse bien, tomar suficiente agua y dormir con buena ventilación ayudan más que cualquier "efecto inmediato" de maquillaje. No hay atajos mágicos — es rutina sostenida en el tiempo.',
    ],
  },
  {
    id: 'r1', destacado: true, kicker: 'Rutas',
    titulo: 'Laguna de Yarinacocha: la joya de Pucallpa',
    dek: 'Paseo en bote, artesanía shipibo-conibo y las mejores puestas de sol de la ciudad.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Laguna_de_Yarinacocha_desde_un_bote_01.jpg/500px-Laguna_de_Yarinacocha_desde_un_bote_01.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    ubicacionMaps: 'Laguna de Yarinacocha, Pucallpa, Perú',
    cuerpo: [
      'A veinte minutos del centro, Yarinacocha es un antiguo meandro del río Ucayali que quedó aislado en forma de herradura — por eso sus aguas son quietas, distintas a las del río. Desde el puerto de Puerto Callao salen los botes hacia las comunidades de San Francisco y Santa Clara.',
      'El paseo clásico dura entre una y dos horas: se navega bordeando la vegetación flotante, se para en algún taller de artesanía shipibo-conibo, y se cierra con la puesta de sol sobre el agua, el momento que todo pucallpino recomienda no perderse.',
    ],
  },
  {
    id: 'r2', kicker: 'Rutas',
    titulo: 'Plaza de Armas: el punto de partida del centro',
    dek: 'El corazón de la ciudad, ideal para empezar a conocer Pucallpa a pie.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '2 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Plaza_de_Armas_de_Pucallpa%2C_Per%C3%BA.jpg/500px-Plaza_de_Armas_de_Pucallpa%2C_Per%C3%BA.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    ubicacionMaps: 'Plaza de Armas, Pucallpa, Perú',
    cuerpo: [
      'Frente a la catedral y a pocas cuadras del malecón, la Plaza de Armas es el mejor punto de referencia para orientarse en el centro. Bancas a la sombra, un obelisco y el ir y venir constante de mototaxis alrededor.',
      'De noche se llena de puestos de comida y familias que salen a caminar, sobre todo los fines de semana. Es también el punto de partida clásico para llegar caminando al Reloj Público, a unas cuadras.',
    ],
  },
  {
    id: 'r3', kicker: 'Rutas',
    titulo: 'Catedral Virgen de la Inmaculada',
    dek: 'El templo principal de Pucallpa, frente a la Plaza de Armas.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '2 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/La_catedral_de_Pucallpa_2022.jpg/500px-La_catedral_de_Pucallpa_2022.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    ubicacionMaps: 'Catedral Virgen de la Inmaculada, Pucallpa, Perú',
    cuerpo: [
      'La catedral de Pucallpa es sede de la Vicariato Apostólico de Pucallpa y el templo católico más importante de la ciudad. Su fachada, sobre la Plaza de Armas, es una de las postales más fotografiadas del centro.',
      'Recibe misa diaria y se llena para las celebraciones patronales de la ciudad. Aunque no es antigua comparada con las catedrales de la sierra o la costa, es un punto de referencia obligado si estás conociendo el centro.',
    ],
  },
  {
    id: 'r4', kicker: 'Rutas',
    titulo: 'Museo Agustín Rivas Vásquez: el Picasso de la Amazonía',
    dek: 'Esculturas en madera talladas de raíces y troncos, en el antiguo taller del artista.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Pucallpa1.JPG/500px-Pucallpa1.JPG',
    imgCredito: 'Foto: Wikimedia Commons (imagen referencial de Pucallpa)',
    ubicacionMaps: 'Museo Agustín Rivas Vásquez, Pucallpa, Perú',
    cuerpo: [
      'Agustín Rivas Vásquez, apodado "el Picasso de la Amazonía", pasó décadas transformando raíces y troncos de la selva en esculturas de formas humanas y espirituales, muchas inspiradas en sus experiencias con la ayahuasca.',
      'Su antiguo taller-museo en Pucallpa conserva buena parte de esa obra: piezas de gran tamaño talladas directamente de la forma natural de la madera, sin cortarla en bloques primero. Una parada obligada para quien le interesa el arte amazónico fuera de lo turístico convencional.',
    ],
  },
  {
    id: 'r5', kicker: 'Rutas',
    titulo: 'Plaza del Reloj Público: el punto de encuentro clásico',
    dek: 'El reloj más reconocible de la ciudad, cerca del puerto.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '2 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Reloj_publico_pucallpa_2022.jpg/500px-Reloj_publico_pucallpa_2022.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    ubicacionMaps: 'Plaza del Reloj Público, Pucallpa, Perú',
    cuerpo: [
      'A pocas cuadras del puerto de Pucallpa, la Plaza del Reloj Público es un clásico punto de encuentro y referencia para dar direcciones ("nos vemos en el reloj" es prácticamente una institución local).',
      'Buena parada para combinar con una caminata hacia el malecón y el puerto, sobre todo al atardecer, cuando baja el calor y la zona se llena de gente.',
    ],
  },
  {
    id: 'r6', kicker: 'Rutas',
    titulo: 'Parque Natural de Pucallpa: fauna amazónica de cerca',
    dek: 'Zoológico y museo regional en un mismo espacio, ideal para ir en familia.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Puente_central_del_Parque_Natural_de_Pucallpa.jpg/500px-Puente_central_del_Parque_Natural_de_Pucallpa.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    ubicacionMaps: 'Parque Natural de Pucallpa, Pucallpa, Perú',
    cuerpo: [
      'El Parque Natural de Pucallpa combina zoológico y museo regional: se puede ver de cerca especies amazónicas como el otorongo, el manatí y distintas aves, además de piezas sobre la historia de Ucayali.',
      'Es una de las salidas favoritas para ir en familia, con senderos, puentes y zonas de descanso dentro del parque. Recomendable ir temprano, antes de que suba el calor del mediodía.',
    ],
  },
  {
    id: 'r7', kicker: 'Rutas',
    titulo: 'Laguna Cashibococha: la alternativa tranquila a Yarinacocha',
    dek: 'Menos conocida, menos concurrida, ideal para pasar el día en familia.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '2 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Cashibo_cocha.jpg/500px-Cashibo_cocha.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    ubicacionMaps: 'Laguna Cashibococha, Pucallpa, Perú',
    cuerpo: [
      'Cashibococha es la laguna que eligen los que ya conocen Yarinacocha y buscan algo más tranquilo: menos puestos, menos bulla, más naturaleza. Es un buen plan de día completo con la familia.',
      'La zona alberga también la comunidad nativa Santa Teresita de Cashibococha. Como en toda laguna amazónica, conviene ir con repelente y protector solar — la sombra escasea sobre el agua.',
    ],
  },
  {
    id: 'r8', kicker: 'Rutas',
    titulo: 'Usko Ayar: el taller de Pablo Amaringo, hoy escuela de pintura',
    dek: 'El legado del maestro del arte visionario shipibo sigue vivo en su antigua casa-escuela.',
    autor: 'Redacción Boga', fecha: '05 sep 2026', lectura: '3 min',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Hanna_jon_2002_amaringo_pablo.jpg/500px-Hanna_jon_2002_amaringo_pablo.jpg',
    imgCredito: 'Foto: Wikimedia Commons',
    cuerpo: [
      'Pablo Amaringo (1938-2009) fue uno de los máximos exponentes del arte visionario amazónico: pintaba de memoria las visiones que decía haber tenido bajo ayahuasca, con una explosión de color y detalle que lo llevó a exponer en museos de varios países.',
      'Su casa-taller en Pucallpa, "Usko Ayar", funcionó como escuela de arte para jóvenes de la ciudad, muchos sin recursos para estudiar pintura de otra forma. Hoy sigue siendo un referente para entender de dónde sale el arte visionario shipibo que hoy se vende en las ferias de Yarinacocha.',
    ],
  },
];

export const EN_ESTA_EDICION = [
  'El mercado de Bellavista a las 4 de la mañana',
  'Qué pasó con el viejo cine de la calle 7 de Junio',
  'Receta: inchicapi de gallina como lo hace mi abuela',
  'Mapa: dónde hay wifi gratis de verdad en el centro',
];

// Paleta del logo: verde selva + dorado + madera.
export const VERDE = '#0b4d2c';
export const VERDE_CLARO = '#1a7f45';
export const ORO = '#e0a72e';

// --- Helpers ------------------------------------------------------------------

/** Slug legible y estable para la URL del artículo (/revista/<slug>). */
export function slugify(s: string): string {
  return s
    .normalize('NFD')                 // é -> e + U+0301
    .replace(/[̀-ͯ]/g, '')  // quita los acentos ya separados
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

const SLUG_A_NOTA = new Map<string, Nota>(NOTAS.map((n) => [slugify(n.titulo), n]));
const ID_A_NOTA = new Map<string, Nota>(NOTAS.map((n) => [n.id, n]));

export function notaSlug(n: Nota): string {
  return slugify(n.titulo);
}

/** Ruta canónica del artículo. */
export function notaHref(n: Nota): string {
  return `/revista/${slugify(n.titulo)}`;
}

export function getNotaBySlug(slug: string): Nota | undefined {
  return SLUG_A_NOTA.get(slug);
}

export function getNotaById(id: string): Nota | undefined {
  return ID_A_NOTA.get(id);
}

const MESES: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
};

/** "05 sep 2026" -> "2026-09-05" (para datePublished en JSON-LD y sitemap). */
export function fechaISO(fecha: string): string {
  const m = fecha.trim().toLowerCase().match(/^(\d{1,2})\s+([a-z]{3})\w*\.?\s+(\d{4})$/);
  if (!m) return new Date().toISOString().slice(0, 10);
  const [, d, mon, y] = m;
  return `${y}-${MESES[mon] ?? '01'}-${d.padStart(2, '0')}`;
}

export function relacionadas(nota: Nota, max = 3): Nota[] {
  return NOTAS.filter((n) => n.kicker === nota.kicker && n.id !== nota.id).slice(0, max);
}
