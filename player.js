// Esperamos a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", function() {
  const generateButton = document.getElementById('generate-player');
  const videoUrlInput = document.getElementById('video-url');
  const bannerUrlInput = document.getElementById('banner-url');
  const iframeCodeTextArea = document.getElementById('iframe-code');
  const reproductorContainer = document.getElementById('reproductor');

  // Función para generar el reproductor
  function generarReproductor() {
    const videoUrl = videoUrlInput.value;
    const bannerUrl = bannerUrlInput.value;

    // Comprobamos si las URL no están vacías
    if (!videoUrl || !bannerUrl) {
      alert('Por favor, ingresa ambas URLs (video y banner).');
      return;
    }

    // Limpiar el contenedor antes de generar el reproductor
    reproductorContainer.innerHTML = '';

    // Crear el reproductor HTML
    reproductorContainer.innerHTML = `
      <div class="plyr__video-embed" id="player">
        <video id="video-player" poster="${bannerUrl}" controls>
          <source src="${videoUrl}" type="application/x-mpegURL" />
        </video>
      </div>
    `;

    // Inicializar Plyr
    const player = new Plyr('#player', {
      controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
      autoplay: true,
    });

    // Generar el código iframe
    const iframeHTML = `<iframe src="https://github.com/Yuucito/Yuuplayer/index.html" width="600" height="400" frameborder="0" allowfullscreen></iframe>`;
    iframeCodeTextArea.value = iframeHTML;
  }

  // Asociamos la función al evento de clic del botón
  generateButton.addEventListener('click', generarReproductor);
});
