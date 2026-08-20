/**
 * Fetches current weather for a given latitude and longitude using OpenWeatherMap API.
 */
export async function fetchWeather(lat: number, lon: number) {
  const apiKeys = [
    '21288d00cbea7f86ead0feafba2b995f', // New key
    '5c91b1080f712cebd25b2cbf0ac6ba2d'  // Old working key
  ];

  for (const apiKey of apiKeys) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      console.log(`fetchWeather fetching: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      console.log('fetchWeather response data:', data);
      
      if (response.ok && data && data.main && data.weather && data.weather[0]) {
        const temp = data.main.temp;
        const main = data.weather[0].main;
        
        const interpretMain = (condition: string) => {
          switch (condition.toLowerCase()) {
            case 'thunderstorm': return { label: 'Thunderstorm', icon: '⛈️' };
            case 'drizzle': return { label: 'Drizzle', icon: '🌦️' };
            case 'rain': return { label: 'Rainy', icon: '🌧️' };
            case 'snow': return { label: 'Snowy', icon: '❄️' };
            case 'clear': return { label: 'Clear Sky', icon: '☀️' };
            case 'clouds': return { label: 'Cloudy', icon: '⛅' };
            case 'mist':
            case 'smoke':
            case 'haze':
            case 'dust':
            case 'fog':
            case 'sand':
            case 'ash':
            case 'squall':
            case 'tornado':
              return { label: condition, icon: '🌫️' };
            default:
              return { label: condition, icon: '🌡️' };
          }
        };
        
        const info = interpretMain(main);
        return {
          temp,
          ...info
        };
      } else {
        console.warn(`ApiKey ${apiKey} response structure invalid or API error:`, data);
      }
    } catch (error) {
      console.error(`Failed to fetch weather for api key ${apiKey}:`, error);
    }
  }
  return null;
}

