

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface Coordinates {
    lat: number;
    lng: number;
}



interface DistanceResult {
    distances: number[]; // Distância de cada trecho em km
    totalDistance: number; // Distância total em km
}

/**
 * Geocodifica um endereço usando Mapbox Geocoding API
 */
export const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
    if (!MAPBOX_TOKEN) {
        console.warn('Mapbox token não configurado');
        return null;
    }

    if (!address || address.trim().length < 5) {
        return null;
    }

    try {
        const encodedAddress = encodeURIComponent(address + ', Brasil');
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&country=BR&limit=1`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            return { lat, lng };
        }

        return null;
    } catch (error) {
        console.error('Erro ao geocodificar endereço:', error);
        return null;
    }
};

/**
 * Calcula a distância entre dois pontos usando Mapbox Directions API
 */
export const calculateDistanceBetweenPoints = async (
    origin: Coordinates,
    destination: Coordinates
): Promise<number> => {
    if (!MAPBOX_TOKEN) {
        console.warn('Mapbox token não configurado');
        return 0;
    }

    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}&overview=false`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            // Retorna em km (API retorna em metros)
            return data.routes[0].distance / 1000;
        }

        return 0;
    } catch (error) {
        console.error('Erro ao calcular distância:', error);
        return 0;
    }
};

/**
 * Calcula a distância total de um roteiro com múltiplos endereços
 * Recebe arrays de endereços de coleta e entrega
 * Usa uma única chamada à API Mapbox para garantir a melhor rota otimizada
 */
export const calculateRouteDistance = async (
    pickupAddresses: string[],
    deliveryAddresses: string[]
): Promise<DistanceResult> => {
    const result: DistanceResult = {
        distances: [],
        totalDistance: 0
    };

    if (!MAPBOX_TOKEN) {
        return result;
    }

    // Combina todos os endereços em ordem: coletas primeiro, depois entregas
    const allAddresses = [...pickupAddresses, ...deliveryAddresses].filter(a => a.trim().length > 0);

    if (allAddresses.length < 2) {
        return result;
    }

    try {
        // Geocodifica todos os endereços
        const coordinatesPromises = allAddresses.map(addr => geocodeAddress(addr));
        const coordinates = await Promise.all(coordinatesPromises);

        // Filtra endereços que não foram geocodificados
        const validCoords = coordinates.filter((c): c is Coordinates => c !== null);

        if (validCoords.length < 2) {
            return result;
        }

        // Se temos até 25 pontos, usa uma única chamada para rota otimizada
        // A API Mapbox suporta até 25 waypoints por requisição
        if (validCoords.length <= 25) {
            // Monta as coordenadas no formato: lng,lat;lng,lat;...
            const waypointsStr = validCoords.map(c => `${c.lng},${c.lat}`).join(';');

            // Chamada única à API com todos os waypoints
            // - annotations=distance: retorna distância de cada trecho
            // - overview=false: não precisa da geometria completa
            // - alternatives=false: sempre retorna a melhor rota
            // - continue_straight=false: permite curvas para otimizar rota
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypointsStr}?access_token=${MAPBOX_TOKEN}&overview=false&annotations=distance&alternatives=false&continue_straight=false`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];

                // A API retorna a distância total da melhor rota
                result.totalDistance = Math.round((route.distance / 1000) * 10) / 10;

                // Se tiver anotações de distância por leg (trecho)
                if (route.legs) {
                    result.distances = route.legs.map((leg: any) =>
                        Math.round((leg.distance / 1000) * 10) / 10
                    );
                }

                return result;
            }
        }

        // Fallback: se tiver mais de 25 pontos, calcula trecho a trecho
        for (let i = 0; i < validCoords.length - 1; i++) {
            const distance = await calculateDistanceBetweenPoints(validCoords[i], validCoords[i + 1]);
            result.distances.push(Math.round(distance * 10) / 10);
            result.totalDistance += distance;
        }

        result.totalDistance = Math.round(result.totalDistance * 10) / 10;

        return result;
    } catch (error) {
        console.error('Erro ao calcular rota:', error);
        return result;
    }
};

export interface AddressSuggestion {
    id: string;
    placeName: string;
    address: string;
    coordinates: Coordinates;
}

/**
 * Busca sugestões de endereços para autocomplete
 */
export const searchAddresses = async (query: string): Promise<AddressSuggestion[]> => {
    if (!MAPBOX_TOKEN || !query || query.trim().length < 3) {
        return [];
    }

    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&country=BR&limit=5&language=pt&types=address,place,locality,neighborhood`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            return data.features.map((feature: any) => ({
                id: feature.id,
                placeName: feature.place_name,
                address: feature.place_name,
                coordinates: {
                    lat: feature.center[1],
                    lng: feature.center[0]
                }
            }));
        }

        return [];
    } catch (error) {
        console.error('Erro ao buscar sugestões de endereço:', error);
        return [];
    }
};

/**
 * Verifica se o token Mapbox está configurado
 */
export const isMapboxConfigured = (): boolean => {
    return !!MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.');
};
