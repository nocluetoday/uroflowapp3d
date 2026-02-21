import { useCallback, useEffect, useState } from 'react';
import { createUroflow3DJob, getUroflow3DJob } from '../api';

const ACTIVE_JOB_STATUSES = new Set(['queued', 'running', 'submitting']);

const INITIAL_JOB_STATE = {
  jobId: null,
  status: 'idle',
  error: null,
  artifacts: [],
};

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export function use3DJobPolling({ apiBase, inputs, onResult, onBackendOnlineChange }) {
  const [jobState, setJobState] = useState(INITIAL_JOB_STATE);
  const [submitting3D, setSubmitting3D] = useState(false);

  const create3DJob = useCallback(async () => {
    setSubmitting3D(true);
    setJobState({ ...INITIAL_JOB_STATE, status: 'submitting' });

    try {
      const data = await createUroflow3DJob(apiBase, inputs);
      setJobState({
        jobId: data.job_id,
        status: data.status,
        error: null,
        artifacts: [],
      });
      onBackendOnlineChange?.(true);
    } catch (err) {
      setJobState({
        ...INITIAL_JOB_STATE,
        status: 'failed',
        error: errorMessage(err, 'Could not submit 3D job.'),
      });
      onBackendOnlineChange?.(false);
    } finally {
      setSubmitting3D(false);
    }
  }, [apiBase, inputs, onBackendOnlineChange]);

  useEffect(() => {
    if (!jobState.jobId || !ACTIVE_JOB_STATUSES.has(jobState.status)) {
      return undefined;
    }

    const intervalId = setInterval(async () => {
      try {
        const data = await getUroflow3DJob(apiBase, jobState.jobId);
        setJobState((prev) => ({
          ...prev,
          status: data.status,
          artifacts: data.artifacts || [],
          error: data.error || null,
        }));

        if (data.result) {
          onResult?.(data.result);
        }
      } catch (err) {
        setJobState((prev) => ({
          ...prev,
          status: 'failed',
          error: errorMessage(err, 'Could not poll 3D job.'),
        }));
      }
    }, 1200);

    return () => clearInterval(intervalId);
  }, [apiBase, jobState.jobId, jobState.status, onResult]);

  return {
    jobState,
    submitting3D,
    create3DJob,
  };
}
