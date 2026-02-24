import { useCallback, useEffect, useReducer } from 'react';
import { createUroflow3DJob, getUroflow3DJob } from '../api';

const ACTIVE_JOB_STATUSES = new Set(['queued', 'running', 'submitting']);

const INITIAL_JOB_STATE = {
  jobId: null,
  status: 'idle',
  error: null,
  artifacts: [],
  message: 'Generate a 3D job to export field artifacts.',
};

const JOB_ACTIONS = {
  CREATE_STARTED: 'create_started',
  CREATE_SUCCEEDED: 'create_succeeded',
  CREATE_LOCAL_COMPLETED: 'create_local_completed',
  POLL_SUCCEEDED: 'poll_succeeded',
  POLL_FAILED: 'poll_failed',
};

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function jobStateReducer(state, action) {
  switch (action.type) {
    case JOB_ACTIONS.CREATE_STARTED:
      return { ...INITIAL_JOB_STATE, status: 'submitting', message: 'Submitting 3D job...' };
    case JOB_ACTIONS.CREATE_SUCCEEDED:
      return {
        ...INITIAL_JOB_STATE,
        jobId: action.payload.jobId,
        status: action.payload.status,
        message: 'Backend job accepted. Polling status...',
      };
    case JOB_ACTIONS.CREATE_LOCAL_COMPLETED:
      return {
        ...INITIAL_JOB_STATE,
        status: 'completed',
        message: action.payload.message,
      };
    case JOB_ACTIONS.POLL_SUCCEEDED:
      return {
        ...state,
        status: action.payload.status,
        artifacts: action.payload.artifacts,
        error: action.payload.error,
        message: action.payload.status === 'completed'
          ? '3D artifacts generated successfully.'
          : '3D job is running...',
      };
    case JOB_ACTIONS.POLL_FAILED:
      return {
        ...state,
        status: 'completed',
        error: null,
        message: 'Live 3D preview is available. Backend artifact polling is unavailable.',
      };
    default:
      return state;
  }
}

export function use3DJobPolling({ apiBase, inputs, onResult }) {
  const [jobState, dispatch] = useReducer(jobStateReducer, INITIAL_JOB_STATE);
  const submitting3D = jobState.status === 'submitting';

  const create3DJob = useCallback(async () => {
    dispatch({ type: JOB_ACTIONS.CREATE_STARTED });

    try {
      const data = await createUroflow3DJob(apiBase, inputs);
      dispatch({
        type: JOB_ACTIONS.CREATE_SUCCEEDED,
        payload: {
          jobId: data.job_id,
          status: data.status,
        },
      });
    } catch {
      dispatch({
        type: JOB_ACTIONS.CREATE_LOCAL_COMPLETED,
        payload: {
          message: 'Local 3D phantom updated. Backend export is currently offline.',
        },
      });
    }
  }, [apiBase, inputs]);

  useEffect(() => {
    if (!jobState.jobId || !ACTIVE_JOB_STATUSES.has(jobState.status)) {
      return undefined;
    }

    const intervalId = setInterval(async () => {
      try {
        const data = await getUroflow3DJob(apiBase, jobState.jobId);
        dispatch({
          type: JOB_ACTIONS.POLL_SUCCEEDED,
          payload: {
            status: data.status,
            artifacts: data.artifacts || [],
            error: data.error || null,
          },
        });

        if (data.result) {
          onResult?.(data.result);
        }
      } catch (err) {
        dispatch({
          type: JOB_ACTIONS.POLL_FAILED,
          payload: {
            error: errorMessage(err, 'Could not poll 3D job.'),
          },
        });
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
