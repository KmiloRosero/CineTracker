let currentUserId = null;

function setSession(userId) {
  currentUserId = userId;
}

function getSession() {
  return currentUserId;
}

function clearSession() {
  currentUserId = null;
}

module.exports = { setSession, getSession, clearSession };
