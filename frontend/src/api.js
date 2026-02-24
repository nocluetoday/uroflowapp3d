import { totalUrethralLengthCm } from './sim/uroflowModel';

function withJsonHeaders(init = {}) {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  };
}

async function requestJson(apiBase, path, { method = 'GET', body, errorPrefix = 'Request failed' } = {}) {
  const requestInit = body === undefined
    ? { method }
    : withJsonHeaders({ method, body: JSON.stringify(body) });

  const response = await fetch(`${apiBase}${path}`, requestInit);
  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${response.statusText}`);
  }

  return response.json();
}

function toScalarPayload(payload) {
  return {
    p_det: Number(payload.p_det),
    length: totalUrethralLengthCm(payload),
    volume: Number(payload.volume),
    ipp_grade: Number(payload.ipp_grade),
  };
}

function toJobPayload(inputs) {
  return {
    p_det: Number(inputs.p_det),
    length: totalUrethralLengthCm(inputs),
    volume: Number(inputs.volume),
    ipp_grade: Number(inputs.ipp_grade),
    mesh_resolution: Number(inputs.mesh_resolution),
  };
}

export async function pingBackend(apiBase) {
  try {
    const response = await fetch(`${apiBase}/`);
    return response.ok;
  } catch {
    return false;
  }
}

export function simulate(apiBase, payload) {
  return requestJson(apiBase, '/simulate', {
    method: 'POST',
    body: toScalarPayload(payload),
    errorPrefix: 'Error',
  });
}

export function createUroflow3DJob(apiBase, inputs) {
  return requestJson(apiBase, '/jobs/uroflow3d', {
    method: 'POST',
    body: toJobPayload(inputs),
    errorPrefix: '3D job request failed',
  });
}

export function getUroflow3DJob(apiBase, jobId) {
  return requestJson(apiBase, `/jobs/${jobId}`, {
    errorPrefix: 'Job status failed',
  });
}
