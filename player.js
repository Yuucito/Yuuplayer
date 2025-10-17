document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('player');
    const thumbnailOverlay = document.getElementById('thumbnail-overlay');
    const playButton = document.getElementById('play-button');
    const qualitySelector = document.getElementById('quality-selector');
    
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const jsonData = urlParams.get('data');
    const episodeParam = urlParams.get('episode') || '01';
    
    if (!jsonData) {
        alert('Error: Falta el parámetro de datos en la URL');
        return;
    }

    try {
        // Decodificar y parsear JSON
        const episodes = JSON.parse(atob(jsonData));
        const episode = episodes.find(ep => ep.episode === episodeParam);
        
        if (!episode) {
            alert(`Error: Episodio ${episodeParam} no encontrado`);
            return;
        }

        // Filtrar solo enlaces de descarga (calidades)
        const qualitySources = episode.servers.filter(server => 
            server.download && server.value
        ).map(server => ({
            label: server.download,
            src: server.value.trim()
        }));

        // Configurar calidades
        if (qualitySources.length === 0) {
            alert('Error: No se encontraron fuentes de video válidas');
            return;
        }

        // Cargar primera calidad por defecto
        video.src = qualitySources[0].src;
        video.load();

        // Crear opciones de calidad
        qualitySources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.src;
            option.textContent = source.label;
            qualitySelector.appendChild(option);
        });

        // Manejar cambio de calidad
        qualitySelector.addEventListener('change', (e) => {
            video.src = e.target.value;
            video.load();
            video.play();
        });

        // Manejar reproducción
        playButton.addEventListener('click', () => {
            thumbnailOverlay.style.opacity = '0';
            setTimeout(() => {
                thumbnailOverlay.style.display = 'none';
                video.style.display = 'block';
                video.play();
            }, 300);
        });

    } catch (e) {
        console.error('Error al procesar datos:', e);
        alert('Error: Datos inválidos en la URL');
    }
});
