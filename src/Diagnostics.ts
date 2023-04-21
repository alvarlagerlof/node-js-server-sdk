import LogEventProcessor from './LogEventProcessor';
import { StatsigOptions } from './StatsigOptions';
import { ExhaustSwitchError } from './utils/core';

export interface Marker {
  key: KeyType;
  action: ActionType;
  step: StepType | null;
  value: string | number | boolean | null;
  timestamp: number;
  metadata?: MarkerMetadata;
}

export interface MarkerMetadata {
  url?: string;
}

export type ContextType = 'initialize' | 'config_sync' | 'event_logging';
export type KeyType =
  | 'download_config_specs'
  | 'bootstrap'
  | 'get_id_list'
  | 'get_id_list_sources'
  | 'overall';
export type StepType = 'process' | 'network_request';
export type ActionType = 'start' | 'end';

type DiagnosticsMarkers = {
  intialize: Marker[];
  configSync: Marker[];
  eventLogging: Marker[];
};

export default class Diagnostics {
  markers: DiagnosticsMarkers;
  private disable: boolean;
  private logger: LogEventProcessor;
  private options: StatsigOptions;

  constructor(args: {
    logger: LogEventProcessor;
    options?: StatsigOptions;
    markers?: DiagnosticsMarkers;
  }) {
    this.logger = args.logger;
    this.markers = args.markers ?? {
      intialize: [],
      configSync: [],
      eventLogging: [],
    };
    this.disable = args.options?.disableDiagnostics ?? false;
    this.options = args.options ?? {};
  }

  mark(
    context: ContextType,
    key: KeyType,
    action: ActionType,
    step?: StepType,
    value?: string | number | boolean,
    metadata?: Record<string, unknown>,
  ) {
    if (this.disable) {
      return;
    }

    const marker: Marker = {
      key,
      action,
      step: step ?? null,
      value: value ?? null,
      timestamp: Date.now(),
      metadata: metadata,
    };
    this.addMarker(context, marker);
  }

  addMarker(context: ContextType, marker: Marker) {
    switch (context) {
      case 'config_sync':
        this.markers.configSync.push(marker);
        break;
      case 'initialize':
        this.markers.intialize.push(marker);
        break;
      case 'event_logging':
        this.markers.eventLogging.push(marker);
        break;
      default:
        throw new ExhaustSwitchError(context);
    }
  }

  logDiagnostics(context: ContextType) {
    if (this.disable) {
      return;
    }
    switch (context) {
      case 'config_sync':
        this.logger.logDiagnosticsEvent({
          context,
          markers: this.markers.configSync,
        });
        this.markers.configSync = [];
        break;
      case 'initialize':
        this.logger.logDiagnosticsEvent({
          context,
          markers: this.markers.intialize,
          initTimeoutMs: this.options.initTimeoutMs,
        });
        this.markers.intialize = [];
        break;
      case 'event_logging':
        this.logger.logDiagnosticsEvent({
          context,
          markers: this.markers.eventLogging,
        });
        this.markers.eventLogging = [];
        break;
      default:
        throw new ExhaustSwitchError(context);
    }
  }
}