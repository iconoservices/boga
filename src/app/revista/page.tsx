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
    titulo: 'La feria de Yarinacocha reunió a toda la ciudad este fin de semana',
    dek: 'Emprendedores, música en vivo y el reencuentro de siempre a orillas de la laguna. Las postales de la noche.',
    autor: 'Redacción', fecha: '01 sep 2026', lectura: '3 min',
    img: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
    cuerpo: [
      'Fueron dos días, más de ochenta puestos y un cálculo municipal de doce mil visitantes. La feria de Yarinacocha volvió a ser lo que siempre fue: menos un mercado y más una excusa para que la ciudad se junte a comer juanane, escuchar cumbia y saludar a medio mundo.',
      'Entre los puestos nuevos destacaron dos marcas de cacao de productores de Curimaná y un colectivo de jóvenes ceramistas shipibo-konibo que agotó su stock el sábado a las nueve de la noche. La organización ya anunció una segunda edición para diciembre.',
    ],
  },
  {
    id: 'n4', destacado: true, kicker: 'Actualidad',
    titulo: 'Nuevo malecón de Bellavista: qué se sabe y cuándo abre',
    dek: 'La obra avanza al 70%. Recorrimos el tramo terminado y hablamos con los comerciantes que ya se están mudando.',
    autor: 'J. Ríos', fecha: '31 ago 2026', lectura: '6 min',
    img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&q=80',
    cuerpo: [
      'El proyecto contempla 900 metros de paseo peatonal, ciclovía, un mirador sobre el Ucayali y 24 módulos comerciales. El tramo entre el jirón Tacna y la bajada al puerto ya está terminado y, aunque no hay inauguración oficial, la gente lo usa desde hace semanas para trotar al atardecer.',
      'Los comerciantes tienen sentimientos encontrados. Los módulos nuevos son más caros que los puestos informales que reemplazan, pero también más seguros y con luz. "Si de verdad traen turistas, vale la pena", dice una vendedora de chochos que ya firmó su contrato.',
      'La municipalidad estima la apertura completa para la primera quincena de octubre, condicionada a la instalación eléctrica del último tramo.',
    ],
  },
  {
    id: 'n5', kicker: 'Gastronomía',
    titulo: 'Guía definitiva del tacacho con cecina en Pucallpa',
    dek: 'Dónde se come el mejor, cuánto cuesta y por qué el plátano bellaco lo cambia todo.',
    autor: 'M. Panduro', fecha: '30 ago 2026', lectura: '8 min',
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
    cuerpo: [
      'El buen tacacho empieza en el plátano: bellaco verde, asado a la brasa y no hervido, machacado con manteca de chancho y chicharrón mientras todavía está caliente. Si se enfría antes de machacarlo, queda apelmazado. Ese es el secreto que separa un tacacho de puesto de uno de casa.',
      'Recorrimos siete lugares. Los favoritos: un puesto sin nombre en el mercado 2 que abre solo hasta el mediodía, y una picantería en Yarinacocha donde la cecina la ahúman con leña de capirona. Precios entre 12 y 22 soles. La regla: si te lo sirven con cebolla encurtida y ají charapita entero, estás en buenas manos.',
    ],
  },
  {
    id: 'n6', kicker: 'Cultura',
    titulo: 'El kené shipibo no es un adorno, es un idioma',
    dek: 'Las artesanas de San Francisco explican qué dice cada línea del diseño.',
    autor: 'Redacción', fecha: '29 ago 2026', lectura: '5 min',
    img: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=1200&q=80',
    cuerpo: [
      'El kené es el sistema de diseños geométricos del pueblo shipibo-konibo. No es decoración: cada trazo representa un camino, un río, una visión. Las artesanas mayores "leen" un manto como quien lee un texto, y dicen que un diseño mal cerrado deja "la energía suelta".',
      'En la comunidad de San Francisco, a media hora de Yarinacocha, un grupo de mujeres enseña kené a las adolescentes los sábados. La preocupación es la misma que con el bote de madera: que el conocimiento no salte una generación. La diferencia es que aquí el mercado ayuda —los mantos se venden bien— siempre que el precio llegue a quien borda y no solo al intermediario.',
    ],
  },
  {
    id: 'n7', kicker: 'Naturaleza',
    titulo: 'Amanecer en el Boquerón del Padre Abad',
    dek: 'Tres horas de carretera para ver caer el agua entre la niebla. Vale cada minuto.',
    autor: 'K. Vela', fecha: '28 ago 2026', lectura: '4 min',
    img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80',
    cuerpo: [
      'El truco es salir de Pucallpa a las tres de la mañana. Se llega al cañón justo cuando el sol empieza a filtrarse entre las paredes de roca y la neblina se levanta de a poco. Las cascadas —la Novia, el Velo de la Novia— bajan con fuerza en temporada de lluvias y el sonido tapa cualquier conversación.',
      'Llevar zapatillas con buen agarre, poncho y no dejar basura: el lugar es área de conservación. Hay puestos de caldo de gallina a la salida que son, para muchos, la mitad de la razón del viaje.',
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
    titulo: 'Juane: la historia detrás del plato que solo se come en junio',
    dek: 'De la fiesta de San Juan a tu mesa: por qué este tamal amazónico tiene fecha propia.',
    autor: 'M. Panduro', fecha: '25 ago 2026', lectura: '4 min',
    img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80',
    cuerpo: [
      'El juane —arroz, gallina, huevo y especias envueltos en hoja de bijao— se asocia a San Juan Bautista y se come sobre todo alrededor del 24 de junio. La forma redonda, dice la tradición, representa la cabeza del santo; la hoja, la bandeja.',
      'Fuera de temporada cuesta encontrarlo bien hecho, pero hay puestos en Pucallpa que lo mantienen todo el año. El detalle que importa: la hoja de bijao debe soasarse antes de envolver, si no amarga. Y el arroz va graneado, nunca pastoso.',
    ],
  },
  {
    id: 'n11', kicker: 'Cultura',
    titulo: '¿Por qué Yarinacocha se llama así? La respuesta está en el shipibo',
    dek: 'Yarina + cocha: dos palabras que explican la laguna y a la gente que vive de ella.',
    autor: 'Redacción', fecha: '24 ago 2026', lectura: '3 min',
    img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=1200&q=80',
    cuerpo: [
      '"Cocha" es laguna en quechua amazónico; "yarina" es la palmera de cuyo fruto se saca el marfil vegetal. Yarinacocha sería, entonces, "la laguna de las yarinas". La laguna es en realidad un antiguo meandro del río Ucayali que quedó aislado —un lago en forma de herradura.',
      'Ese origen explica su ecología: aguas quietas, mucha vegetación flotante y una pesca distinta a la del río. También explica por qué las comunidades shipibo se asentaron en sus orillas: laguna tranquila, tierra firme cerca y salida al río cuando hace falta.',
    ],
  },
  {
    id: 'n12', kicker: 'Actualidad',
    titulo: 'Manejar mototaxi en Pucallpa: las reglas que nadie te dice',
    dek: 'Rutas, tarifas y códigos no escritos del transporte que mueve la ciudad.',
    autor: 'C. Pinedo', fecha: '23 ago 2026', lectura: '5 min',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80',
    cuerpo: [
      'La tarifa base dentro del casco urbano ronda los 3 soles y sube por zona y por hora. De noche, a la lluvia o si hay que cruzar un puente, se paga más y nadie discute. La regla de oro para el pasajero: preguntar el precio antes de subir, no después.',
      'Entre choferes hay un código: no "robar" pasajero que otro ya está negociando, respetar los paraderos informales y ceder el paso en las bajadas al puerto. Quien lo rompe se gana la mala fama del gremio, que en una ciudad así se corre rápido.',
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
