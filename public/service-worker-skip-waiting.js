self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    event.waitUntil(self.skipWaiting());
  }
});
