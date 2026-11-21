from __future__ import annotations

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from .models import CandidateRecord, CertificationRecord, CoursePackageSchema

COURSES_CATALOG: list[CoursePackageSchema] = [
    CoursePackageSchema(
        id="ingles-turismo-01",
        version="1.1.0",
        title="Inglés Básico para Turismo",
        maya_title="Kaambal Ingles utia'al Xíimbal",
        skill_tag="Inglés Turístico",
        badge_name="Anfitrión Bilingüe Maya-Caribe",
        level="Básico",
        module_count=5,
        estimated_minutes=15,
        size_kb=28,
        video_compare_mb=45,
        description=(
            "Saludos, recepción de huéspedes, indicaciones y cortesía básica con audio "
            "bilingüe Español / Maayat'aan sin depender de conexión."
        ),
        lesson={
            "id": "les-ingles-01",
            "title": "Bienvenida, precios y guía segura en cenotes",
            "maya_subtitle": "Ma'alob k'iin — Bienvenida cordial al visitante",
            "body_text": (
                "En el turismo comunitario, los primeros 30 segundos generan confianza. "
                "Usa frases cortas y claras en inglés acompañadas de tu identidad local: "
                "1) 'Welcome to our hotel!' (¡Bienvenido a nuestro hotel!). "
                "2) 'Can I help you with your luggage?' (¿Puedo ayudarle con su equipaje?). "
                "3) 'Your room is on the second floor.' (Su habitación está en el segundo piso)."
            ),
            "speech_script": (
                "Lección 1: Inglés Básico para Turismo. "
                "Para dar la bienvenida di: Welcome to our hotel. "
                "Para ofrecer ayuda di: Can I help you with your luggage. "
                "Para indicar la habitación di: Your room is on the second floor."
            ),
            "key_vocabulary": [
                "Welcome = Bienvenido / K'ambe'enil",
                "Thank you = Muchas gracias / Dios bo'otik",
                "Room = Habitación / Najil wenel",
                "Luggage = Equipaje / Kuuch",
            ],
        },
        quiz=[
            {
                "id": "q-ing-1",
                "prompt": "¿Cómo das la bienvenida a un huésped al llegar?",
                "options": [
                    "Where is the bus station?",
                    "Welcome to our hotel.",
                    "The restaurant is closed today.",
                ],
                "correct_index": 1,
                "explanation": "'Welcome to our hotel.' transmite hospitalidad clara desde el primer contacto.",
            },
            {
                "id": "q-ing-2",
                "prompt": "Un huésped llega con maletas pesadas. ¿Qué le dices?",
                "options": [
                    "Can I help you with your luggage?",
                    "Please wait outside.",
                    "I do not speak English.",
                ],
                "correct_index": 0,
                "explanation": "'Can I help you with your luggage?' ofrece asistencia cordial.",
            },
            {
                "id": "q-ing-3",
                "prompt": "Despedida cordial al entregar la llave de la habitación:",
                "options": [
                    "Please leave your shoes outside.",
                    "Thank you very much, enjoy your stay.",
                    "Do not look at the cenote.",
                ],
                "correct_index": 1,
                "explanation": "'Enjoy your stay' desea una feliz estadía al visitante.",
            },
        ],
        interactive_unit={
            "subtitle": "Unidad 1 · Atención al Huésped",
            "speech_lang": "en-US",
            "vocab_title": "Paso 1 · Vocabulario Clave de Recepción",
            "vocab_desc": "Toca cualquier tarjeta o usa los controles para escuchar y pausar la pronunciación sin internet.",
            "phrases": [
                {
                    "main": "Welcome to our hotel.",
                    "es": "Bienvenido a nuestro hotel.",
                    "yua": "K'ambe'enil ichil k-hotel.",
                },
                {
                    "main": "Can I help you with your luggage?",
                    "es": "¿Puedo ayudarle con su equipaje?",
                    "yua": "Je'el u páajtal in wáantikech yéetel a kuuche'.",
                },
                {
                    "main": "Your room is on the second floor.",
                    "es": "Su habitación está en el segundo piso.",
                    "yua": "A najil wenel ti’ yaan tu ka’a píiso.",
                },
                {
                    "main": "Thank you very much, enjoy your stay.",
                    "es": "Muchas gracias, disfrute su estadía.",
                    "yua": "Dios bo'otik, ki'imakchajak a wóol waye'.",
                },
            ],
            "builder": {
                "title": "Paso 2 · Ordena la Oración",
                "prompt_es": "Ordena las fichas para decir: \"¿Puedo ayudarle?\"",
                "prompt_yua": "Ts’áa tu tsoolil: \"¿Je’el u páajtal in wáantikech?\"",
                "tiles": ["you", "Can", "?", "help", "I"],
                "expected": ["Can", "I", "help", "you", "?"],
                "ok_msg": "\"Can I help you?\" es correcto.",
                "err_msg": "Orden incorrecto (-1 vida). Pista: empieza con \"Can I...\".",
            },
            "pairs": [
                {"id": 0, "es": "Bienvenido", "yua": "K'ambe'enil", "target": "Welcome"},
                {"id": 1, "es": "Muchas gracias", "yua": "Dios bo'otik", "target": "Thank you"},
                {"id": 2, "es": "Habitación", "yua": "Najil wenel", "target": "Room"},
                {"id": 3, "es": "Equipaje", "yua": "Kuuch", "target": "Luggage"},
            ],
            "listen": {
                "title": "Paso 4 · Escucha y Comprende",
                "audio_text": "Your room is on the second floor.",
                "question_es": "Escucha el audio offline y elige lo que indica el recepcionista:",
                "question_yua": "U’uy le t’aano’ ka a yéey ba’ax ku ya’alik:",
                "options": [
                    "Su habitación está en el segundo piso.",
                    "El desayuno se sirve a las ocho.",
                    "La playa está cruzando la calle.",
                ],
                "correct_index": 0,
                "ok_msg": "\"Your room is on the second floor.\"",
            },
            "exam": [
                {
                    "type": "order",
                    "label_es": "Reto 1/3 · Forma la bienvenida oficial en inglés:",
                    "label_yua": "1/3 · Beet le k’ambe’enil ich inglés:",
                    "tiles": ["hotel", "our", "to", "Welcome"],
                    "expected": ["Welcome", "to", "our", "hotel"],
                },
                {
                    "type": "choice",
                    "label_es": "Reto 2/3 · Un huésped llega con maletas pesadas. ¿Qué le dices?",
                    "label_yua": "2/3 · K’uch juntúul u’ulab yéetel aal kuuch. ¿Ba’ax ka wa’alikti’?",
                    "options": [
                        "Can I help you with your luggage?",
                        "Where is the bus station?",
                        "The restaurant is closed today.",
                    ],
                    "correct": 0,
                },
                {
                    "type": "choice",
                    "label_es": "Reto 3/3 · Despedida cordial al entregar la llave:",
                    "label_yua": "3/3 · T’aan utia’al a ts’áaik u llaveil naj:",
                    "options": [
                        "Please wait outside.",
                        "Thank you very much, enjoy your stay.",
                        "I do not speak English.",
                    ],
                    "correct": 1,
                },
            ],
        },
    ),
    CoursePackageSchema(
        id="finanzas-artesanos-01",
        version="1.1.0",
        title="Finanzas para Artesanos",
        maya_title="Kalan Taak'in utia'al Meyajil K'ab",
        skill_tag="Finanzas y Costeo",
        badge_name="Maestro en Costeo Justo",
        level="Básico",
        module_count=4,
        estimated_minutes=15,
        size_kb=31,
        video_compare_mb=38,
        description=(
            "Cálculo de costos de materiales, fijación de precios justos y control de ganancias "
            "para cooperativas y talleres locales sin conexión."
        ),
        lesson={
            "id": "les-fin-01",
            "title": "Regla de los 3 sobres: Costo, Trabajo y Utilidad",
            "maya_subtitle": "U nu'ukbesajil taak'in — Cuidar el fruto de tus manos",
            "body_text": (
                "Muchos artesanos cobran solo el precio del hilo o la madera y olvidan sumar su tiempo. "
                "Para fijar un precio justo aplica esta fórmula simple: "
                "Precio Justo = Materiales + Mano de Obra + Margen de Ganancia."
            ),
            "speech_script": (
                "Lección 1: Finanzas para Artesanos. "
                "Nunca vendas solo al costo del material. "
                "Suma tres partes: materiales, mano de obra y un margen de ganancia para reinvertir."
            ),
            "key_vocabulary": [
                "Costo Directo = Hilo, madera y tintes",
                "Mano de Obra = Horas de bordado",
                "Ganancia Neta = Dinero libre tras gastos",
                "Reinversión = Fondo del 20% por venta",
            ],
        },
        quiz=[
            {
                "id": "q-fin-1",
                "prompt": "¿Cuáles son los tres componentes de un precio artesanal justo?",
                "options": [
                    "Solo el costo del transporte",
                    "Materiales + Mano de Obra + Ganancia",
                    "El precio que diga el primer comprador",
                ],
                "correct_index": 1,
                "explanation": "Tu tiempo y esfuerzo tienen valor económico y deben sumarse junto a los materiales.",
            },
            {
                "id": "q-fin-2",
                "prompt": "Un hotel pide 20 caminos de mesa con 15% de descuento. ¿Qué revisas primero?",
                "options": [
                    "Que el precio final siga cubriendo materiales, mano de obra y ganancia.",
                    "Aceptar cualquier precio aunque pierda dinero.",
                    "No anotar los gastos de transporte.",
                ],
                "correct_index": 0,
                "explanation": "Vender debajo de tus costos totales descapitaliza tu taller.",
            },
            {
                "id": "q-fin-3",
                "prompt": "¿Para qué sirve apartar el 20% de cada venta en un fondo?",
                "options": [
                    "Para gastarlo el mismo día en cosas personales.",
                    "Para reponer hilos y materiales sin endeudarse.",
                    "Para no llevar registro en libreta.",
                ],
                "correct_index": 1,
                "explanation": "El fondo de reinversión garantiza insumos para la siguiente producción.",
            },
        ],
        interactive_unit={
            "subtitle": "Unidad 1 · Costeo y Precio Justo",
            "speech_lang": "es-MX",
            "vocab_title": "Paso 1 · Conceptos Clave del Taller",
            "vocab_desc": "Aprende a separar tus materiales, tu tiempo de bordado o tallado y tu ganancia neta sin internet.",
            "phrases": [
                {
                    "main": "Costo de Materiales = Hilo + Tela + Tintes",
                    "es": "Todo insumo que compras para elaborar una pieza es costo directo.",
                    "yua": "Tuláakal ba'ax ka manik utia'al a beetik junp'éel meyaj.",
                },
                {
                    "main": "Mano de Obra = Horas trabajadas × Valor por hora",
                    "es": "Tu tiempo y conocimiento artesanal deben pagarse como un sueldo justo.",
                    "yua": "A k'iin yéetel a na'at k'a'abéet u bo'ota'al ma'alob.",
                },
                {
                    "main": "Precio de Venta = Costo Total + Margen de Ganancia",
                    "es": "Nunca vendas por debajo de tu costo; agrega al menos 30% de margen.",
                    "yua": "Ma' a konik tu yáanal u tojol; ts'áa u náajalil.",
                },
                {
                    "main": "Fondo de Reinversión = 20% de cada venta",
                    "es": "Guarda una parte para comprar materia prima sin pedir prestado.",
                    "yua": "Ta'ak junxéet' taak'in utia'al a manik nu'ukul.",
                },
            ],
            "builder": {
                "title": "Paso 2 · Arma la Fórmula del Precio Justo",
                "prompt_es": "Ordena las fichas para formar la ecuación correcta de venta:",
                "prompt_yua": "Ts’áa tu tsoolil bix u jóok’ol u tojol le meyajo’:",
                "tiles": ["Ganancia", "Materiales", "+", "Mano de Obra", "+"],
                "expected": ["Materiales", "+", "Mano de Obra", "+", "Ganancia"],
                "ok_msg": "¡Exacto! Materiales + Mano de Obra + Ganancia = Precio Justo.",
                "err_msg": "Orden incorrecto (-1 vida). Empieza sumando \"Materiales + Mano de Obra...\".",
            },
            "pairs": [
                {"id": 0, "es": "Hilo, madera y tintes", "yua": "Nu’ukul meyaj", "target": "Costo Directo"},
                {"id": 1, "es": "Horas de bordado", "yua": "K’iin meyaj", "target": "Mano de Obra"},
                {"id": 2, "es": "Dinero libre tras gastos", "yua": "Náajalil", "target": "Ganancia Neta"},
                {"id": 3, "es": "Ahorro para insumos", "yua": "Ta’ak’in", "target": "Reinversión"},
            ],
            "listen": {
                "title": "Paso 4 · Caso Práctico en Audio",
                "audio_text": "Si gastas ciento veinte pesos en hilos y ochenta en mano de obra, tu costo base es doscientos pesos.",
                "question_es": "Escucha el caso del taller y calcula cuál es el costo base de la pieza:",
                "question_yua": "U’uy le ejemplo yéetel ilawil bajux u costo base:",
                "options": [
                    "$200 pesos ($120 materiales + $80 mano de obra)",
                    "$120 pesos (solo contar los hilos)",
                    "$80 pesos (solo contar el tiempo)",
                ],
                "correct_index": 0,
                "ok_msg": "Costo base = $200 MXN. Sobre eso se suma el margen de ganancia.",
            },
            "exam": [
                {
                    "type": "order",
                    "label_es": "Reto 1/3 · Ordena la regla básica de control financiero:",
                    "label_yua": "1/3 · Ts’áa tu tsoolil bix u kanáanta’al taak’in:",
                    "tiles": ["del taller", "Separar", "personal", "el dinero"],
                    "expected": ["Separar", "el dinero", "del taller", "personal"],
                },
                {
                    "type": "choice",
                    "label_es": "Reto 2/3 · Un hotel te pide 20 caminos de mesa con 15% de descuento. ¿Qué revisas primero?",
                    "label_yua": "2/3 · Junp’éel hotel u k’áat 20 meyajo’ob yéetel descuento. ¿Ba’ax ka wilik táanil?",
                    "options": [
                        "Que el precio final siga cubriendo materiales, mano de obra y ganancia.",
                        "Aceptar cualquier precio aunque pierda dinero.",
                        "No anotar los gastos de transporte.",
                    ],
                    "correct": 0,
                },
                {
                    "type": "choice",
                    "label_es": "Reto 3/3 · ¿Para qué sirve apartar el 20% de cada venta en un fondo?",
                    "label_yua": "3/3 · ¿Ba’axten ma’alob u ta’aka’al 20% ti’ cada koonol?",
                    "options": [
                        "Para gastarlo el mismo día en cosas personales.",
                        "Para reponer hilos y materiales sin endeudarse.",
                        "Para no llevar registro en libreta.",
                    ],
                    "correct": 1,
                },
            ],
        },
    ),
]


def seed_database(db: Session) -> None:
    """Inserta candidatos y certificaciones iniciales si la tabla está vacía."""
    existing = db.query(CandidateRecord).first()
    if existing is not None:
        return

    now = datetime.now(timezone.utc)
    seed_candidates = [
        CandidateRecord(
            id="cand-maria-pm",
            full_name="María Ixchel Chan",
            community="Puerto Morelos, Q. Roo",
            primary_language="Español • Maya • Inglés Básico",
            created_at=now - timedelta(days=5),
        ),
        CandidateRecord(
            id="cand-joseluis-fcp",
            full_name="José Guadalupe May",
            community="Felipe Carrillo Puerto, Q. Roo",
            primary_language="Español • Maya",
            created_at=now - timedelta(days=4),
        ),
        CandidateRecord(
            id="cand-nayeli-cun",
            full_name="Nayeli Balam Uicab",
            community="Cancún, Q. Roo",
            primary_language="Español • Maya",
            created_at=now - timedelta(days=2),
        ),
    ]
    db.add_all(seed_candidates)
    db.flush()

    seed_certs = [
        CertificationRecord(
            candidate_id="cand-maria-pm",
            course_id="ingles-turismo-01",
            course_title="Inglés Básico para Turismo",
            skill_tag="Inglés Turístico",
            badge_name="Anfitrión Bilingüe Maya-Caribe",
            score=3,
            max_score=3,
            passed=True,
            duration_seconds=145,
            attempts=1,
            validation_hash="YK-77A1-VERIFIED-9821",
            completed_at=now - timedelta(days=4),
            synced_at=now - timedelta(days=4),
        ),
        CertificationRecord(
            candidate_id="cand-joseluis-fcp",
            course_id="finanzas-artesanos-01",
            course_title="Finanzas para Artesanos",
            skill_tag="Finanzas y Costeo",
            badge_name="Maestro en Costeo Justo",
            score=3,
            max_score=3,
            passed=True,
            duration_seconds=192,
            attempts=1,
            validation_hash="YK-9F2A-VERIFIED-4410",
            completed_at=now - timedelta(days=3),
            synced_at=now - timedelta(days=3),
        ),
        CertificationRecord(
            candidate_id="cand-nayeli-cun",
            course_id="ingles-turismo-01",
            course_title="Inglés Básico para Turismo",
            skill_tag="Inglés Turístico",
            badge_name="Anfitrión Bilingüe Maya-Caribe",
            score=2,
            max_score=3,
            passed=True,
            duration_seconds=118,
            attempts=2,
            validation_hash="YK-7D3C-VERIFIED-819F",
            completed_at=now - timedelta(days=1),
            synced_at=now - timedelta(days=1),
        ),
    ]
    db.add_all(seed_certs)
    db.commit()
