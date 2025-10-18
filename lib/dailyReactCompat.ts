import React from 'react';

type ReactInternalKeys =
  | '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'
  | '__SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'
  | '__CLIENT_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED';

const reactAny = React as unknown as Record<ReactInternalKeys, unknown>;

if (typeof reactAny.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED === 'undefined') {
  const fallbackKey = (['__SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED', '__CLIENT_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'] as ReactInternalKeys[])
    .find((key) => typeof reactAny[key] !== 'undefined');

  if (fallbackKey) {
    reactAny.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = reactAny[fallbackKey];
  } else {
    reactAny.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {};
  }
}

const legacyInternals = reactAny.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as (Record<string, unknown> & {
  ReactCurrentDispatcher?: unknown;
}) | undefined;

if (legacyInternals && typeof legacyInternals.ReactCurrentDispatcher === 'undefined') {
  const dispatcherSources: Array<{ ReactCurrentDispatcher?: unknown } | undefined> = [
    reactAny.__SECRET_INTERNALS_EXPERIMENTAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as { ReactCurrentDispatcher?: unknown } | undefined,
    reactAny.__CLIENT_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as { ReactCurrentDispatcher?: unknown } | undefined,
  ];

  const directDispatcher = (React as unknown as { __dispatcher?: unknown }).__dispatcher;
  if (typeof directDispatcher !== 'undefined') {
    dispatcherSources.push({ ReactCurrentDispatcher: directDispatcher });
  }

  const dispatcherCandidate = dispatcherSources
    .map((candidate) => candidate?.ReactCurrentDispatcher)
    .find((value) => typeof value !== 'undefined');

  if (typeof dispatcherCandidate !== 'undefined') {
    legacyInternals.ReactCurrentDispatcher = dispatcherCandidate;
  }
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
