import {
  StatsigInvalidArgumentError,
  StatsigLocalModeNetworkError,
  StatsigTooManyRequestsError,
  StatsigUninitializedError,
} from './Errors';
import OutputLogger from './OutputLogger';
import { getSDKType, getSDKVersion, getStatsigMetadata } from './utils/core';
import safeFetch from './utils/safeFetch';

export const ExceptionEndpoint = 'https://statsigapi.net/v1/sdk_exception';

export default class ErrorBoundary {
  private sdkKey: string;
  private statsigMetadata = getStatsigMetadata();
  private seen = new Set<string>();

  constructor(sdkKey: string) {
    this.sdkKey = sdkKey;
  }

  swallow<T>(task: () => T) {
    this.capture(task, () => {
      return undefined;
    });
  }

  capture<T>(task: () => T, recover: (e: unknown) => T): T {
    try {
      const result = task();
      if (result instanceof Promise) {
        return (result as any).catch((e: unknown) => {
          return this.onCaught(e, recover);
        });
      }
      return result;
    } catch (error) {
      return this.onCaught(error, recover);
    }
  }

  setup(sdkKey: string) {
    this.sdkKey = sdkKey;
  }

  private onCaught<T>(error: unknown, recover: (e: unknown) => T): T {
    if (
      error instanceof StatsigUninitializedError ||
      error instanceof StatsigInvalidArgumentError ||
      error instanceof StatsigTooManyRequestsError
    ) {
      throw error; // Don't catch these
    }
    if (error instanceof StatsigLocalModeNetworkError) {
      return recover(error);
    }

    OutputLogger.error(
      '[Statsig] An unexpected exception occurred.',
      error as Error,
    );

    this.logError(error);

    return recover(error);
  }

  public logError(error: unknown, key?: string) {
    try {
      if (!this.sdkKey) {
        return;
      }

      const unwrapped = (error ?? Error('[Statsig] Error was empty'));
      const isError = unwrapped instanceof Error;
      const name = isError && unwrapped.name ? unwrapped.name : 'No Name';
      if (this.seen.has(name) || (key != null && this.seen.has(key))) {
        return;
      }
      this.seen.add(name);

      const info = isError ? unwrapped.stack : this.getDescription(unwrapped);
      const body = JSON.stringify({
        exception: name,
        info,
        statsigMetadata: this.statsigMetadata ?? {},
      });
      safeFetch(ExceptionEndpoint, {
        method: 'POST',
        headers: {
          'STATSIG-API-KEY': this.sdkKey,
          'STATSIG-SDK-TYPE': getSDKType(),
          'STATSIG-SDK-VERSION': getSDKVersion(),
          'Content-Type': 'application/json',
        },
        body,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      }).catch(() => {});
    } catch {/* noop */}
  }

  private getDescription(obj: unknown): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return '[Statsig] Failed to get string for error.';
    }
  }
}
