"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';

// "Yo Soy de la Selva" — la revista/blog digital de Boga. Masthead + barra de
// secciones + notas que se abren como artículo (vista de lectura tipo blog).
// Contenido de muestra hasta que haya un CMS / tabla de notas.

const EDICION = 'Edición 07 · Septiembre 2026';

// Secciones = categorías del blog. "Portada" es la vista curada; el resto filtra.
const SECCIONES = ['Actualidad', 'Cultura', 'Lifestyle', 'Vida Social', 'Gastronomía', 'Naturaleza', 'Rutas'];

type Nota = {
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
  destacado?: boolean;
  portada?: boolean;
};

const NOTAS: Nota[] = [
  {
    id: 'portada', portada: true, destacado: true, kicker: 'Crónica',
    titulo: 'El último maestro del bote de madera en Yarinacocha',
    dek: 'Don Aurelio tiene 74 años y las manos llenas de astillas. En su taller a orillas de la laguna todavía se construyen peque-peques como hace medio siglo — pero ya nadie quiere aprender el oficio.',
    autor: 'Redacción Boga', fecha: '02 sep 2026', lectura: '6 min',
    img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&q=80',
    cita: { texto: 'Acá el río manda. Si el río sube, tu día cambia. Si el río baja, también. Uno aprende a vivir preguntándole al agua.', autor: 'Aurelio Sangama' },
    cuerpo: [
      'El taller de don Aurelio no tiene letrero. Es un techo de calamina sostenido por horcones de topa, a diez metros del agua, donde el olor a aserrín compite con el de la resina de copaiba que él mismo hierve para sellar las junturas. Lleva 52 años haciendo botes y todavía no usa un solo plano: "el bote está en la madera, uno solo lo saca".',
      'Cuando empezó había nueve talleres como el suyo alrededor de la laguna. Hoy queda uno. Los peque-peques de fibra de vidrio llegan de Pucallpa armados y más baratos, y los jóvenes prefieren un trabajo con sueldo fijo. Don Aurelio lo entiende, pero le duele: "una lancha de madera bien hecha te dura treinta años; la de fibra, con suerte diez, y no la puedes remendar".',
      'Su hija menor le insiste en que grabe videos, que enseñe por internet. Él se ríe. Pero esta semana, por primera vez, dejó que un muchacho del barrio se quedara a mirar toda la mañana. "Si aprende aunque sea a poner la quilla, ya algo queda", dice, y vuelve a cepillar.',
    ],
  },
  {
    id: 'n1', destacado: true, kicker: 'Lifestyle',
    titulo: 'Stefano Klima detrás del foco: sus aficiones, sueños y recuerdos',
    dek: 'El fotógrafo ítalo-peruano nos abre su universo personal: de sus viajes a la Toscana e Islandia a su afición por el Real Madrid, su gata Mera y el deporte.',
    autor: 'Redacción', fecha: '02 sep 2026', lectura: '7 min',
    img: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=1200&q=80',
    cuerpo: [
      'Dice que la fotografía lo encontró a él y no al revés. A los diecinueve años cambió una cámara por una bicicleta y no volvió a soltarla. Desde entonces ha retratado bodas en Tarapoto, campañas en Lima y, últimamente, la vida cotidiana de Pucallpa, que lo tiene "obsesionado con la luz de las cinco de la tarde".',
      'Fuera del trabajo, Stefano es un hombre de rutinas: corre seis kilómetros antes del amanecer, ve al Real Madrid con la misma taza de café desde hace años y viaja siempre con un cuaderno donde no escribe, dibuja. Islandia y la Toscana son sus dos polos: "el hielo y el vino, no necesito más".',
      'Su compañera de estudio es Mera, una gata negra que aparece en la mitad de sus historias de Instagram. "Es mi editora —bromea—. Si se sienta sobre una foto impresa, esa foto no va".',
    ],
  },
  {
    id: 'n2', kicker: 'Lifestyle',
    titulo: 'La técnica para lograr una piel luminosa en el calor de la selva',
    dek: 'Cómo potenciar la luz natural de la piel con hidratación, activos y una rutina simple que sí se puede sostener con humedad y 34 grados.',
    autor: 'M. Vela', fecha: '02 sep 2026', lectura: '5 min',
    img: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=1200&q=80',
    cuerpo: [
      'La primera regla en clima húmedo es contraintuitiva: menos capas, no más. Un limpiador suave en gel, un sérum ligero con vitamina C por la mañana y protector solar reaplicado al mediodía hacen más que cualquier mascarilla pesada que se derrita a media tarde.',
      'La luminosidad, dicen las dermatólogas consultadas, es sobre todo hidratación y constancia. El ácido hialurónico sobre la piel todavía húmeda, dormir con el ventilador lejos de la cara y tomar agua real —no gaseosa— cambian el rostro en dos semanas. Los "glow" instantáneos son maquillaje; esto es rutina.',
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
    id: 'n4', destacado: true, kicker: 'Actualidad',
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
    id: 'n7', kicker: 'Naturaleza',
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
    autor: 'J. Ríos', fecha: '27 ago 2026', lectura: '7 min',
    img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
    cuerpo: [
      'La lancha rápida sale del puerto de Pucallpa por la mañana y hace el tramo en unas seis horas; el "deslizador" lento cuesta la mitad pero se toma el doble de tiempo. Presupuesto realista para dos días: pasaje ida y vuelta, hospedaje sencillo y comida, todo por debajo de 180 soles por persona.',
      'En Contamana no te pierdas los baños termales de Agua Caliente y el mirador del cerro. Llevar efectivo (los cajeros fallan seguido), repelente y una muda extra: en el río siempre te mojas más de lo que crees.',
    ],
  },
  {
    id: 'n9', kicker: 'Vida Social',
    titulo: 'La señora que alimenta a media cuadra desde su ventana',
    dek: 'Hace doce años que doña Rosa cocina de más "por si alguien pasa con hambre". La conocimos.',
    autor: 'R. Isuiza', fecha: '26 ago 2026', lectura: '5 min',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1200&q=80',
    cuerpo: [
      'La rutina de doña Rosa no cambió desde 2014: cocina una olla grande, aparta lo de su familia y el resto lo deja en la ventana con un cartel de cartón que dice "sírvete". Empezó con los recicladores que pasaban de madrugada; ahora hay días en que reparte veinte platos.',
      'No acepta que la llamen caridad. "Yo cocino igual, solo pongo más agua y más plátano", dice. Los vecinos se organizaron sin decírselo: uno le manda arroz, otro la posta de pollo, la bodega de la esquina le fía el aceite. La cuadra entera come de esa ventana.',
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
    id: 'r1', kicker: 'Rutas',
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

const EN_ESTA_EDICION = [
  'El mercado de Bellavista a las 4 de la mañana',
  'Qué pasó con el viejo cine de la calle 7 de Junio',
  'Receta: inchicapi de gallina como lo hace mi abuela',
  'Mapa: dónde hay wifi gratis de verdad en el centro',
];

const VERDE = '#0b4d2c';
const VERDE_CLARO = '#1a7f45';
const ORO = '#e0a72e';

function Byline({ n }: { n: Nota }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-secondary">
      <span className="font-label-md text-[11px] uppercase tracking-wider text-on-surface">{n.autor}</span>
      <span className="w-1 h-1 rounded-full bg-secondary/40" />
      <span className="font-label-md text-[11px] uppercase tracking-wider">{n.fecha}</span>
      <span className="w-1 h-1 rounded-full bg-secondary/40" />
      <span className="font-label-md text-[11px]">{n.lectura} de lectura</span>
    </div>
  );
}

// Tarjeta de nota con el título ENCIMA de la imagen (estilo tapa de revista).
function NotaCard({ n, lead = false, onOpen }: { n: Nota; lead?: boolean; onOpen: (n: Nota) => void }) {
  return (
    <button
      onClick={() => onOpen(n)}
      className={`group relative overflow-hidden rounded-sm text-left w-full ${
        lead ? 'aspect-[16/10] sm:aspect-[21/9] sm:col-span-2 lg:col-span-3' : 'aspect-[4/3]'
      }`}
    >
      <img
        src={n.img}
        alt={n.titulo}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
      <div className={`absolute inset-x-0 bottom-0 ${lead ? 'p-5 lg:p-8' : 'p-4'}`}>
        <span className="inline-block text-white font-label-md text-[9px] uppercase tracking-[0.2em] px-2 py-0.5" style={{ backgroundColor: VERDE }}>
          {n.kicker}
        </span>
        <h3
          className={`text-white font-headline-lg font-extrabold tracking-tight leading-[1.08] mt-2 ${
            lead ? 'text-xl sm:text-3xl lg:text-4xl max-w-[20ch]' : 'text-base lg:text-lg'
          }`}
        >
          {n.titulo}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-white/70">
          <span className="font-label-md text-[10px] uppercase tracking-wider">{n.fecha}</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span className="font-label-md text-[10px]">{n.lectura}</span>
        </div>
      </div>
    </button>
  );
}

function ListaNotas({ notas, onOpen, conLead = false }: { notas: Nota[]; onOpen: (n: Nota) => void; conLead?: boolean }) {
  if (notas.length === 0) {
    return <p className="font-body-md text-secondary text-sm py-10">Todavía no hay notas en esta sección.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
      {notas.map((n, i) => (
        <NotaCard key={n.id} n={n} lead={conLead && i === 0} onOpen={onOpen} />
      ))}
    </div>
  );
}

// Vista de artículo — lectura tipo blog.
function ArticuloView({ nota, relacionadas, onBack, onOpen }: {
  nota: Nota; relacionadas: Nota[]; onBack: () => void; onOpen: (n: Nota) => void;
}) {
  return (
    <article className="pb-4">
      <div className="max-w-[720px] mx-auto px-container-margin lg:px-8 pt-6">
        <button onClick={onBack} className="flex items-center gap-1.5 font-label-md text-[12px] uppercase tracking-wider text-secondary hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Volver a Yo Soy de la Selva
        </button>
        <span className="inline-block mt-5 font-label-md text-[11px] uppercase tracking-[0.25em]" style={{ color: VERDE_CLARO }}>
          {nota.kicker}
        </span>
        <h1 className="font-headline-lg font-extrabold tracking-tight text-on-surface leading-[1.08] text-2xl sm:text-4xl lg:text-[42px] mt-2">
          {nota.titulo}
        </h1>
        <p className="font-body-lg text-on-surface/70 text-base lg:text-lg leading-relaxed mt-4">{nota.dek}</p>
        <div className="mt-5 pb-5 border-b border-on-surface/15">
          <Byline n={nota} />
        </div>
      </div>

      <figure className="max-w-[980px] mx-auto mt-6 px-container-margin lg:px-8">
        <div className="relative overflow-hidden rounded-sm aspect-[16/9]">
          <img src={nota.img} alt={nota.titulo} className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <figcaption className="font-label-md text-[11px] text-secondary mt-2">{nota.imgCredito || 'Foto: archivo Boga · imagen referencial'}</figcaption>
      </figure>

      <div className="max-w-[680px] mx-auto px-container-margin lg:px-8 mt-8">
        {nota.cuerpo.map((p, i) => (
          <p
            key={i}
            className={`font-body-lg text-on-surface/90 text-[17px] leading-[1.75] ${i > 0 ? 'mt-5' : ''} ${
              i === 0
                ? 'first-letter:font-headline-lg first-letter:font-black first-letter:text-[52px] first-letter:leading-[0.8] first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:text-[#0b4d2c]'
                : ''
            }`}
          >
            {p}
          </p>
        ))}

        {nota.cita && (
          <blockquote className="my-9 border-l-4 pl-5" style={{ borderColor: ORO }}>
            <p className="font-headline-lg font-extrabold tracking-tight text-on-surface leading-[1.2] text-xl lg:text-2xl">
              “{nota.cita.texto}”
            </p>
            <footer className="font-label-md text-[11px] uppercase tracking-widest text-secondary mt-3">— {nota.cita.autor}</footer>
          </blockquote>
        )}

        {nota.ubicacionMaps && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nota.ubicacionMaps)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white font-label-md text-[12px] uppercase tracking-wider transition-opacity hover:opacity-90"
            style={{ backgroundColor: VERDE }}
          >
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            Cómo llegar
          </a>
        )}

        <div className="mt-10 pt-5 border-t border-on-surface/15 flex items-center gap-3">
          <span className="font-label-md text-[11px] uppercase tracking-wider text-secondary">Compartir</span>
          {['share', 'link', 'chat'].map((ic) => (
            <span key={ic} className="w-8 h-8 rounded-full border border-surface-container-highest flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[16px]">{ic}</span>
            </span>
          ))}
        </div>
      </div>

      {relacionadas.length > 0 && (
        <div className="max-w-[1100px] mx-auto px-container-margin lg:px-8 mt-14">
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg lg:text-xl border-b border-on-surface/15 pb-3">
            Sigue leyendo · {nota.kicker}
          </h2>
          <div className="grid sm:grid-cols-3 gap-5 mt-6">
            {relacionadas.map((r) => (
              <NotaCard key={r.id} n={r} onOpen={onOpen} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

// useSearchParams() exige un límite Suspense propio (para poder abrir un
// artículo directo con /revista?nota=<id> sin romper el prerenderizado).
export default function Revista() {
  return (
    <Suspense fallback={null}>
      <RevistaConParams />
    </Suspense>
  );
}

function RevistaConParams() {
  const searchParams = useSearchParams();
  const [seccion, setSeccion] = useState<string>('Portada');
  const [abierta, setAbierta] = useState<Nota | null>(null);

  // Permite linkear a un artículo puntual desde afuera (ej. las tarjetas de
  // /guia) con /revista?nota=<id>, sin depender de hacer click adentro.
  useEffect(() => {
    const id = searchParams.get('nota');
    if (!id) return;
    const nota = NOTAS.find((n) => n.id === id);
    if (nota) setAbierta(nota);
  }, [searchParams]);

  const irASeccion = (s: string) => {
    setAbierta(null);
    setSeccion(s);
    if (s !== 'Portada') {
      document.getElementById('historias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const abrir = (n: Nota) => {
    setAbierta(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabs = ['Portada', ...SECCIONES];
  const portada = NOTAS.find((n) => n.portada)!;
  const destacados = NOTAS.filter((n) => n.destacado && !n.portada).slice(0, 3);
  const notasSeccion = seccion === 'Portada'
    ? NOTAS.filter((n) => !n.portada)
    : NOTAS.filter((n) => n.kicker === seccion);
  const relacionadas = abierta
    ? NOTAS.filter((n) => n.kicker === abierta.kicker && n.id !== abierta.id).slice(0, 3)
    : [];

  return (
    <>
      <AppHeader showSearch={false} showLocation={false} showChat={false} showCart={false} />

      <main className="w-full pb-16">

        {/* Masthead — paleta del logo: verde selva + dorado + madera */}
        <div className="text-white border-b-4" style={{ backgroundColor: VERDE, borderColor: ORO }}>
          <div className="max-w-[1100px] mx-auto px-container-margin lg:px-8 py-6 lg:py-8">
            <button onClick={() => irASeccion('Portada')} className="text-left">
              <h1 className="font-headline-lg font-extrabold tracking-tight leading-[0.92] text-[11vw] sm:text-5xl lg:text-6xl">
                Yo Soy <span style={{ color: '#f2d489' }}>de la Selva</span>
              </h1>
            </button>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
              <span className="font-label-md text-[10px] px-2.5 py-1 rounded-sm shadow-sm" style={{ backgroundColor: '#6b4a2e', color: '#f4e7d3' }}>
                Únete y sé un selvático de verdad
              </span>
              <p className="font-label-md text-[10px] uppercase tracking-widest text-white/70">{EDICION}</p>
            </div>
          </div>
        </div>

        {/* Barra de secciones / categorías del blog (sticky) */}
        <nav className="sticky top-0 z-30 bg-surface-container-lowest border-b border-on-surface/15 shadow-[0_4px_10px_rgba(0,0,0,0.03)]">
          <div className="max-w-[1100px] mx-auto flex items-stretch overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {tabs.map((s, i) => {
              const active = !abierta && seccion === s;
              return (
                <button
                  key={s}
                  onClick={() => irASeccion(s)}
                  className={`shrink-0 px-4 py-3 font-headline-sm text-[13px] whitespace-nowrap transition-colors relative ${
                    i > 0 ? 'border-l border-on-surface/12' : ''
                  }`}
                  style={{ color: active ? VERDE : undefined }}
                >
                  <span className={active ? '' : 'text-on-surface'}>{s}</span>
                  {active && <span className="absolute left-0 right-0 -bottom-px h-0.5" style={{ backgroundColor: VERDE }} />}
                </button>
              );
            })}
          </div>
        </nav>

        {abierta ? (
          <ArticuloView nota={abierta} relacionadas={relacionadas} onBack={() => setAbierta(null)} onOpen={abrir} />
        ) : (
          <div className="max-w-[1100px] mx-auto">

            {seccion === 'Portada' && (
              <>
                {/* Nota de portada — se abre como artículo */}
                <button onClick={() => abrir(portada)} className="block w-full text-left px-container-margin lg:px-8 pt-8 group">
                  <div className="relative overflow-hidden rounded-sm aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]">
                    <img src={portada.img} alt={portada.titulo} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8">
                      <span className="inline-block text-white font-label-md text-[10px] uppercase tracking-[0.2em] px-2.5 py-1" style={{ backgroundColor: VERDE }}>
                        {portada.kicker}
                      </span>
                      <h2 className="text-white font-headline-lg font-extrabold tracking-tight leading-[1.03] text-2xl sm:text-4xl lg:text-5xl mt-3 max-w-[16ch]">
                        {portada.titulo}
                      </h2>
                    </div>
                  </div>
                  <p className="font-body-lg text-on-surface/80 text-base lg:text-lg leading-relaxed mt-5 max-w-[62ch]">
                    {portada.dek}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 font-label-md text-[12px] uppercase tracking-wider" style={{ color: VERDE_CLARO }}>
                    Leer la crónica
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </span>
                </button>

                {/* Destacados */}
                <section className="px-container-margin lg:px-8 mt-10 grid sm:grid-cols-3 gap-5 lg:gap-6">
                  {destacados.map((d) => (
                    <NotaCard key={d.id} n={d} onOpen={abrir} />
                  ))}
                </section>
              </>
            )}

            {/* Lista de notas — filtrable por sección */}
            <section id="historias" className="px-container-margin lg:px-8 scroll-mt-16 pt-10">
              <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl border-b border-on-surface/15 pb-3">
                {seccion === 'Portada' ? 'Últimas notas' : seccion}
              </h2>
              <div className="mt-8">
                <ListaNotas notas={notasSeccion} onOpen={abrir} conLead={seccion === 'Portada'} />
              </div>
            </section>

            {seccion === 'Portada' && (
              <section className="px-container-margin lg:px-8 mt-14">
                <div className="bg-surface-container-low rounded-sm p-6 lg:p-8">
                  <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg lg:text-xl">También en la edición 07</h2>
                  <ol className="mt-4 divide-y divide-on-surface/10">
                    {EN_ESTA_EDICION.map((t, i) => (
                      <li key={i} className="flex items-baseline gap-4 py-3">
                        <span className="font-headline-lg font-black text-lg tabular-nums shrink-0" style={{ color: VERDE_CLARO }}>{String(i + 1).padStart(2, '0')}</span>
                        <span className="font-body-md text-on-surface text-sm lg:text-base leading-snug">{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}

            <footer className="px-container-margin lg:px-8 mt-14 pt-6 border-t border-on-surface/15">
              <p className="font-label-md text-[11px] uppercase tracking-[0.25em] text-secondary">Yo Soy de la Selva</p>
              <p className="font-body-md text-secondary/80 text-xs mt-2 max-w-[52ch] leading-relaxed">
                Revista digital de Boga. Historias de Pucallpa y la Amazonía peruana. Fotografía y textos por el equipo de Boga y colaboradores locales. Contenido de muestra — próximamente con firmas reales.
              </p>
            </footer>

          </div>
        )}
      </main>
    </>
  );
}
