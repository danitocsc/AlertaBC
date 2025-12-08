"""
Base de datos de códigos postales de Baja California
==================================================

Esta base de datos contiene los códigos postales principales de Baja California
con sus respectivas coordenadas aproximadas para la conversión postal code -> lat/lon.

Incluye lógica de validación inteligente para aproximar ubicaciones basadas en prefijos
cuando el código exacto no se encuentra en la base de datos.

Fuentes: Código Postal Mexicano (SEPOMEX) y datos geográficos públicos.
"""

# Diccionario de códigos postales de Baja California
# Formato: {codigo_postal: {'lat': float, 'lon': float, 'municipio': str, 'colonia': str}}

BAJA_CALIFORNIA_POSTAL_CODES = {
    # Tijuana - Zona Este (User Reported)
    "22207": {"lat": 32.4900, "lon": -116.8500, "municipio": "Tijuana", "colonia": "Zona Este / El Refugio"},

    # Tijuana - Zona Metropolitana
    "22000": {"lat": 32.5200, "lon": -117.0300, "municipio": "Tijuana", "colonia": "Zona Centro"},
    "22010": {"lat": 32.5149, "lon": -117.0382, "municipio": "Tijuana", "colonia": "Zona Centro Norte"},
    "22020": {"lat": 32.5250, "lon": -117.0200, "municipio": "Tijuana", "colonia": "Zona Río"},
    "22024": {"lat": 32.5100, "lon": -117.0100, "municipio": "Tijuana", "colonia": "Agua Caliente"},
    "22100": {"lat": 32.5300, "lon": -117.0500, "municipio": "Tijuana", "colonia": "20 de Noviembre"},
    "22110": {"lat": 32.5400, "lon": -117.0200, "municipio": "Tijuana", "colonia": "Otay"},
    "22115": {"lat": 32.5500, "lon": -117.0100, "municipio": "Tijuana", "colonia": "Otay Universidad"},
    "22120": {"lat": 32.5100, "lon": -117.0600, "municipio": "Tijuana", "colonia": "La Mesa"},
    "22126": {"lat": 32.4900, "lon": -117.0500, "municipio": "Tijuana", "colonia": "3 de Octubre"},
    "22180": {"lat": 32.4800, "lon": -116.9700, "municipio": "Tijuana", "colonia": "La Presa"},
    "22200": {"lat": 32.4900, "lon": -116.9500, "municipio": "Tijuana", "colonia": "Las Palmas"},
    "22210": {"lat": 32.5000, "lon": -116.9800, "municipio": "Tijuana", "colonia": "Los Pinos"},
    "22220": {"lat": 32.4500, "lon": -116.9200, "municipio": "Tijuana", "colonia": "San Antonio de los Buenos"},
    "22404": {"lat": 32.5500, "lon": -116.9800, "municipio": "Tijuana", "colonia": "Aeropuerto"},
    "22465": {"lat": 32.5200, "lon": -116.9500, "municipio": "Tijuana", "colonia": "Alamar"},
    "22476": {"lat": 32.5300, "lon": -116.9000, "municipio": "Tijuana", "colonia": "10 de Mayo"},
    
    # Ensenada - Zona Metropolitana  
    "22800": {"lat": 31.8709, "lon": -116.5978, "municipio": "Ensenada", "colonia": "Zona Centro"},
    "22810": {"lat": 31.8800, "lon": -116.6100, "municipio": "Ensenada", "colonia": "El Sauzal"},
    "22820": {"lat": 31.8600, "lon": -116.5800, "municipio": "Ensenada", "colonia": "Valle Dorado"},
    "22830": {"lat": 31.8900, "lon": -116.6200, "municipio": "Ensenada", "colonia": "Moderna"},
    "22840": {"lat": 31.8500, "lon": -116.5900, "municipio": "Ensenada", "colonia": "Villa Residencial"},
    "22850": {"lat": 31.8400, "lon": -116.5700, "municipio": "Ensenada", "colonia": "Chapultepec"},
    "22860": {"lat": 31.9000, "lon": -116.6400, "municipio": "Ensenada", "colonia": "Ensenada Centro"},
    "22870": {"lat": 31.8200, "lon": -116.5600, "municipio": "Ensenada", "colonia": "Lázaro Cárdenas"},
    "22880": {"lat": 31.9100, "lon": -116.6500, "municipio": "Ensenada", "colonia": "Carlos Pacheco"},
    
    # Mexicali - Zona Metropolitana
    "21000": {"lat": 32.6638, "lon": -115.4681, "municipio": "Mexicali", "colonia": "Zona Centro"},
    "21100": {"lat": 32.6800, "lon": -115.4800, "municipio": "Mexicali", "colonia": "Nueva"},
    "21200": {"lat": 32.6500, "lon": -115.4500, "municipio": "Mexicali", "colonia": "Los Pinos"},
    "21210": {"lat": 32.6700, "lon": -115.4900, "municipio": "Mexicali", "colonia": "Progreso"},
    "21220": {"lat": 32.6400, "lon": -115.4600, "municipio": "Mexicali", "colonia": "Insurgentes"},
    "21230": {"lat": 32.6900, "lon": -115.5000, "municipio": "Mexicali", "colonia": "Villafuerte"},
    "21240": {"lat": 32.6200, "lon": -115.4300, "municipio": "Mexicali", "colonia": "Xochimilco"},
    "21250": {"lat": 32.7100, "lon": -115.5200, "municipio": "Mexicali", "colonia": "Hacienda"},
    "21260": {"lat": 32.5900, "lon": -115.4000, "municipio": "Mexicali", "colonia": "Los Santos"},
    "21270": {"lat": 32.7300, "lon": -115.5400, "municipio": "Mexicali", "colonia": "Guadalupe Victoria"},
    
    # Tecate - Zona Metropolitana
    "21400": {"lat": 32.5667, "lon": -116.6333, "municipio": "Tecate", "colonia": "Zona Centro"},
    "21410": {"lat": 32.5700, "lon": -116.6400, "municipio": "Tecate", "colonia": "Las Palmas"},
    "21420": {"lat": 32.5600, "lon": -116.6200, "municipio": "Tecate", "colonia": "Los Olivos"},
    "21430": {"lat": 32.5800, "lon": -116.6500, "municipio": "Tecate", "colonia": "Lazaro Cardenas"},
    "21440": {"lat": 32.5500, "lon": -116.6100, "municipio": "Tecate", "colonia": "El Descanso"},
    "21450": {"lat": 32.5900, "lon": -116.6600, "municipio": "Tecate", "colonia": "El Mirador"},
    
    # Rosarito - Zona Costera
    "22700": {"lat": 32.3667, "lon": -117.0500, "municipio": "Rosarito", "colonia": "Zona Centro"},
    "22701": {"lat": 32.3500, "lon": -117.0400, "municipio": "Rosarito", "colonia": "Machado"},
    "22703": {"lat": 32.2833, "lon": -117.0500, "municipio": "Playas de Rosarito", "colonia": "La Bocana"},
    "22704": {"lat": 32.2900, "lon": -117.0600, "municipio": "Playas de Rosarito", "colonia": "Puerto Nuevo"},
    "22705": {"lat": 32.2700, "lon": -117.0400, "municipio": "Playas de Rosarito", "colonia": "Cantamar"},
    "22706": {"lat": 32.2600, "lon": -117.0300, "municipio": "Playas de Rosarito", "colonia": "Primavera"},
    "22707": {"lat": 32.2400, "lon": -117.0200, "municipio": "Playas de Rosarito", "colonia": "El Sauzalito"},
    "22710": {"lat": 32.3700, "lon": -117.0600, "municipio": "Rosarito", "colonia": "Playa Blanca"},
    "22715": {"lat": 32.3400, "lon": -117.0200, "municipio": "Rosarito", "colonia": "Aguamarina"},
    "22720": {"lat": 32.3600, "lon": -117.0400, "municipio": "Rosarito", "colonia": "El Descanso"},
    "22730": {"lat": 32.3800, "lon": -117.0700, "municipio": "Rosarito", "colonia": "Aguajito"},
    "22740": {"lat": 32.3500, "lon": -117.0300, "municipio": "Rosarito", "colonia": "Castillo"},
    "22750": {"lat": 32.3900, "lon": -117.0800, "municipio": "Rosarito", "colonia": "El Mirador"},
    
    # Zonas rurales importantes
    "21110": {"lat": 32.7200, "lon": -115.3500, "municipio": "Ejido Nuevo León", "colonia": "Rural"},
    "21215": {"lat": 32.5800, "lon": -115.3800, "municipio": "Dunamo", "colonia": "Rural"},
    "21315": {"lat": 32.7500, "lon": -115.5500, "municipio": "Ciudad Guadalupe Victoria", "colonia": "Rural"},
    "21405": {"lat": 32.5200, "lon": -116.7100, "municipio": "La Rumorosa", "colonia": "Montañosa"},
    "21406": {"lat": 32.4800, "lon": -116.7500, "municipio": "Juntas de Nej", "colonia": "Montañosa"},
}

def get_approximate_location_by_prefix(postal_code):
    """
    Intenta aproximar la ubicación basada en el prefijo del código postal.
    
    Args:
        postal_code (str): Código postal
        
    Returns:
        dict: Información aproximada o None
    """
    if not postal_code or len(postal_code) < 2:
        return None
        
    prefix_2 = postal_code[:2]
    prefix_3 = postal_code[:3]
    
    # Lógica de aproximación por prefijo
    if prefix_2 == "22":
        # Región Costa (Tijuana, Rosarito, Ensenada)
        if postal_code.startswith("227"):
            return {"lat": 32.3667, "lon": -117.0500, "municipio": "Rosarito", "colonia": "Zona Rosarito (Aprox)"}
        elif postal_code.startswith("228"):
            return {"lat": 31.8709, "lon": -116.5978, "municipio": "Ensenada", "colonia": "Zona Ensenada (Aprox)"}
        else:
            # Default to Tijuana for other 22xxx
            return {"lat": 32.5149, "lon": -117.0382, "municipio": "Tijuana", "colonia": "Zona Tijuana (Aprox)"}
            
    elif prefix_2 == "21":
        # Región Valle/Montaña (Mexicali, Tecate)
        if postal_code.startswith("214"):
            return {"lat": 32.5667, "lon": -116.6333, "municipio": "Tecate", "colonia": "Zona Tecate (Aprox)"}
        else:
            # Default to Mexicali for other 21xxx
            return {"lat": 32.6638, "lon": -115.4681, "municipio": "Mexicali", "colonia": "Zona Mexicali (Aprox)"}
            
    return None

def get_coordinates_by_postal_code(postal_code):
    """
    Obtiene las coordenadas (latitud, longitud) basadas en un código postal.
    Si no existe exacto, intenta aproximar.
    """
    # 1. Búsqueda exacta
    if postal_code in BAJA_CALIFORNIA_POSTAL_CODES:
        data = BAJA_CALIFORNIA_POSTAL_CODES[postal_code]
        return data['lat'], data['lon']
    
    # 2. Búsqueda aproximada
    approx = get_approximate_location_by_prefix(postal_code)
    if approx:
        return approx['lat'], approx['lon']
        
    return None

def get_location_info_by_postal_code(postal_code):
    """
    Obtiene información completa de la ubicación.
    Si no existe exacto, intenta aproximar.
    """
    # 1. Búsqueda exacta
    if postal_code in BAJA_CALIFORNIA_POSTAL_CODES:
        return BAJA_CALIFORNIA_POSTAL_CODES[postal_code]
        
    # 2. Búsqueda aproximada
    return get_approximate_location_by_prefix(postal_code)

def search_postal_codes_by_municipio(municipio):
    """Busca códigos postales por municipio."""
    results = []
    for code, info in BAJA_CALIFORNIA_POSTAL_CODES.items():
        if info['municipio'].lower() == municipio.lower():
            results.append({
                'postal_code': code,
                'municipio': info['municipio'],
                'colonia': info['colonia'],
                'lat': info['lat'],
                'lon': info['lon']
            })
    return results

def get_all_postal_codes():
    """Obtiene todos los códigos postales disponibles."""
    return BAJA_CALIFORNIA_POSTAL_CODES

def validate_postal_code(postal_code):
    """
    Valida que un código postal sea válido para Baja California.
    Acepta códigos exactos O códigos con prefijos válidos (21xxx, 22xxx).
    """
    if not postal_code or not postal_code.isdigit() or len(postal_code) != 5:
        return False
        
    # 1. Check exact match
    if postal_code in BAJA_CALIFORNIA_POSTAL_CODES:
        return True
        
    # 2. Check valid prefixes for BC
    prefix = postal_code[:2]
    return prefix in ["21", "22"]

# Lista de municipios principales para validación
BAJA_CALIFORNIA_MUNICIPIOS = [
    "Tijuana", "Ensenada", "Mexicali", "Tecate", "Rosarito", "Playas de Rosarito"
]

if __name__ == "__main__":
    # Test cases
    print("=== Pruebas de Validación de Códigos Postales ===")
    
    test_codes = ["22010", "22207", "22999", "21999", "90210", "123"]
    
    for code in test_codes:
        info = get_location_info_by_postal_code(code)
        valid = validate_postal_code(code)
        status = "VÁLIDO" if valid else "INVÁLIDO"
        
        print(f"\nCP {code} ({status}):")
        if info:
            print(f"  Municipio: {info['municipio']}")
            print(f"  Colonia: {info['colonia']}")
            print(f"  Coords: {info['lat']}, {info['lon']}")
        else:
            print("  No se encontró información")