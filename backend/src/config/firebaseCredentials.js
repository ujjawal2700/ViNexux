// Accept a single-line JSON service account as an alternative to separate env fields.
export function parseFirebaseServiceAccount(value) {
  if (!value?.trim()) return {};
  try {
    const account = JSON.parse(value);
    if (account?.type !== 'service_account' || !['project_id', 'client_email', 'private_key'].every(key => typeof account[key] === 'string' && account[key].trim())) throw new Error();
    return { projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key };
  } catch {
    // JSON parser errors can include private-key fragments; never forward them.
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be valid service-account JSON with project_id, client_email and private_key.');
  }
}
