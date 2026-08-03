let refreshHandler;

export function setRefreshHandler(handler) {
  refreshHandler = handler;
}

export function clearRefreshHandler() {
  refreshHandler = undefined;
}

export function refreshPage() {
  if (refreshHandler) {
    refreshHandler();
    return;
  }

  window.location.reload();
}
