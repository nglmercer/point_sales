if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister().then(success => {
        if (success) {
          console.log('Service Worker desregistrado');
        }
      });
    }
  });

  // También limpia caches
  caches.keys().then(names => {
    for (let name of names) {
      caches.delete(name);
    }
  });
}
