from __future__ import annotations

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from .models import CandidateRecord, CertificationRecord, CoursePackageSchema

COURSES_CATALOG: list[CoursePackageSchema] = [
    CoursePackageSchema(
        id="ingles-turismo-01",
        version="1.0.0",
        title="Inglés Básico para Turismo",
        maya_title="Kaambal Ingles utia'al Xíimbal",
        skill_tag="Inglés Turístico",
        badge_name="Anfitrión Bilingüe Maya-Caribe",
        level="Básico",
        module_count=5,
        estimated_minutes=12,
        size_kb=28,
        description=(
            "Atención cordial al visitante, saludos, indicaciones básicas y hospitalidad "
            "comunitaria en cenotes y paradores sin depender de conexión."
        ),
        lesson={
            "id": "les-ingles-01",
            "title": "Bienvenida, precios y guía segura en cenotes",
            "maya_subtitle": "Ma'alob k'iin — Bienvenida cordial al visitante",
            "body_text": (
                "En el turismo comunitario, los primeros 30 segundos generan confianza. "
                "Usa frases cortas y claras en inglés acompañadas de tu identidad local: "
                "1) 'Welcome to our community!' (¡Bienvenido a nuestra comunidad!). "
                "2) 'The entrance fee is 200 pesos.' (La entrada cuesta 200 pesos). "
                "3) 'Please wear a life vest before entering the cenote.' "
                "(Por favor use chaleco salvavidas antes de entrar al cenote). "
                "Practica escuchar el ritmo pausado usando el botón de lectura en voz alta."
            ),
            "speech_script": (
                "Lección 1: Inglés Básico para Turismo. "
                "Para dar la bienvenida di: Welcome to our community. "
                "Para indicar el precio de entrada di: The entrance fee is two hundred pesos. "
                "Para cuidar la seguridad en el cenote di: Please wear a life vest before entering the cenote."
            ),
            "key_vocabulary": [
                "Welcome = Bienvenido / Ki'imak óolal",
                "Entrance fee = Costo de entrada",
                "Life vest = Chaleco salvavidas",
                "Follow me, please = Sígame, por favor",
            ],
        },
        quiz=[
            {
                "id": "q-ing-1",
                "prompt": "¿Cómo das la bienvenida a un visitante al llegar al parador turístico?",
                "options": [
                    "Where is the bus station?",
                    "Welcome to our community!",
                    "The store is closed today.",
                ],
                "correct_index": 1,
                "explanation": "'Welcome to our community!' transmite hospitalidad clara desde el primer contacto.",
            },
            {
                "id": "q-ing-2",
                "prompt": "¿Qué frase indica correctamente que el acceso cuesta 200 pesos?",
                "options": [
                    "The entrance fee is 200 pesos.",
                    "My name is 200 pesos.",
                    "Please swim fast now.",
                ],
                "correct_index": 0,
                "explanation": "'Entrance fee' significa tarifa o costo de entrada.",
            },
            {
                "id": "q-ing-3",
                "prompt": "Antes de entrar al agua del cenote, ¿qué instrucción de seguridad debes dar?",
                "options": [
                    "Please leave your shoes on the roof.",
                    "Please wear a life vest before entering the cenote.",
                    "Do not look at the water.",
                ],
                "correct_index": 1,
                "explanation": "'Wear a life vest' indica usar chaleco salvavidas para proteger al visitante.",
            },
        ],
    ),
    CoursePackageSchema(
        id="finanzas-artesanos-01",
        version="1.0.0",
        title="Finanzas para Artesanos",
        maya_title="Kalan Taak'in utia'al Meyajil K'ab",
        skill_tag="Finanzas y Costeo",
        badge_name="Maestro en Costeo Justo",
        level="Básico",
        module_count=4,
        estimated_minutes=15,
        size_kb=31,
        description=(
            "Aprende a calcular el costo real de tus materiales, horas de bordado o tallado "
            "y margen justo para vender sin perder dinero en ferias y mercados."
        ),
        lesson={
            "id": "les-fin-01",
            "title": "Regla de los 3 sobres: Costo, Trabajo y Utilidad",
            "maya_subtitle": "U nu'ukbesajil taak'in — Cuidar el fruto de tus manos",
            "body_text": (
                "Muchos artesanos cobran solo el precio del hilo o la madera y olvidan sumar su tiempo. "
                "Para fijar un precio justo aplica esta fórmula simple: "
                "Precio Justo = Materiales + Mano de Obra + Margen de Ahorro (20%). "
                "Por ejemplo, si un hipil bordado usa 350 pesos en tela e hilos, requiere 450 pesos por tus horas de trabajo "
                "y agregas 160 pesos de utilidad para reinvertir, su precio mínimo debe ser 960 pesos. "
                "Separa el dinero de reposición de materiales antes de gastar la ganancia."
            ),
            "speech_script": (
                "Lección 1: Finanzas para Artesanos. "
                "Nunca vendas solo al costo del material. "
                "Suma tres partes: el costo de tus materiales, el pago por tus horas de trabajo, y un margen de ahorro del veinte por ciento para hacer crecer tu taller."
            ),
            "key_vocabulary": [
                "Costo directo = Tela, hilo, madera o barro",
                "Mano de obra = Valor de tus horas de trabajo",
                "Utilidad = Ganancia para ahorrar o reinvertir",
                "Punto de equilibrio = Venta mínima para no perder",
            ],
        },
        quiz=[
            {
                "id": "q-fin-1",
                "prompt": "¿Cuáles son los tres componentes de un precio artesanal justo?",
                "options": [
                    "Solo el costo del transporte",
                    "Materiales + Mano de Obra + Margen de Utilidad",
                    "El precio que diga el primer comprador",
                ],
                "correct_index": 1,
                "explanation": "Tu tiempo y esfuerzo tienen valor económico y deben sumarse junto a los materiales y utilidad.",
            },
            {
                "id": "q-fin-2",
                "prompt": "Si gastaste $300 en materiales y tu trabajo vale $400, ¿por qué no debes vender la pieza en $500?",
                "options": [
                    "Porque perderías $200 respecto al valor real de tu trabajo y materiales",
                    "Porque los billetes de $500 no sirven en ferias",
                    "Porque el cliente siempre quiere pagar el doble",
                ],
                "correct_index": 0,
                "explanation": "Vender debajo de tus costos totales ($700) descapitaliza tu taller.",
            },
            {
                "id": "q-fin-3",
                "prompt": "¿Qué debes hacer primero al cobrar una venta artesanal?",
                "options": [
                    "Gastar todo el efectivo el mismo día",
                    "Separar el dinero para reponer materiales antes de usar la ganancia",
                    "Regalar el cambio sin anotar la venta",
                ],
                "correct_index": 1,
                "explanation": "Apartar la reposición de insumos garantiza que siempre puedas producir la siguiente pieza.",
            },
        ],
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
            full_name="María Xool",
            community="Puerto Morelos, Q. Roo",
            primary_language="Español • Maya • Inglés Básico",
            created_at=now - timedelta(days=5),
        ),
        CandidateRecord(
            id="cand-joseluis-fcp",
            full_name="José Luis Balam",
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
