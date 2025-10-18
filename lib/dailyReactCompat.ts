import React from 'react';

interface ReactInternals {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: unknown;
  __SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: unknown;
}

const internals = React as unknown as ReactInternals;

if (
  typeof internals.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED === 'undefined' &&
  typeof internals.__SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED !== 'undefined'
) {
  internals.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED =
    internals.__SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
}

type DailyReactModule = typeof import('@daily-co/daily-react');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dailyReact: DailyReactModule = require('@daily-co/daily-react');

const {
  DailyProvider,
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  useMediaTrack,
} = dailyReact;

export {
  DailyProvider,
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  useMediaTrack,
};
