import type { ProviderModelOption } from '@/shared/types.js';

/**
 * cloud-admin-box wires its Kubernetes Secret `cloud-admin-box-claude-model`
 * into this env var. Read once at process start: a switch rollout-restarts
 * the pod, so there is no live re-read to get wrong.
 */
export const DEFAULT_CLAUDE_MODEL_ENV = 'CLOUDCLI_DEFAULT_CLAUDE_MODEL';
export const BAKED_IN_DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5';
/** Exact API model ids only (e.g. claude-sonnet-5, claude-fable-5-1, claude-sonnet-5[1m]). */
export const CLAUDE_MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9.-]*(\[1m\])?$/;

export type ResolvedDefaultClaudeModel = {
  defaultModel: string;
  options: ProviderModelOption[];
  warning?: string;
};

export function resolveDefaultClaudeModel(
  envValue: string | undefined,
  baseOptions: ProviderModelOption[],
): ResolvedDefaultClaudeModel {
  const value = envValue?.trim() ?? '';
  if (!value) {
    return { defaultModel: BAKED_IN_DEFAULT_CLAUDE_MODEL, options: baseOptions };
  }
  if (!CLAUDE_MODEL_ID_PATTERN.test(value)) {
    return {
      defaultModel: BAKED_IN_DEFAULT_CLAUDE_MODEL,
      options: baseOptions,
      warning: `${DEFAULT_CLAUDE_MODEL_ENV}="${value}" is not a valid Claude model id; using ${BAKED_IN_DEFAULT_CLAUDE_MODEL}`,
    };
  }
  if (baseOptions.some((option) => option.value === value)) {
    return { defaultModel: value, options: baseOptions };
  }
  return {
    defaultModel: value,
    options: [
      ...baseOptions,
      {
        value,
        label: value,
        description: `Configured via ${DEFAULT_CLAUDE_MODEL_ENV}`,
        effort: {
          default: 'high',
          values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }, { value: 'max' }],
        },
      },
    ],
  };
}
