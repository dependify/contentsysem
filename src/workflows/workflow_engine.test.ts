
import { Workflow, StepResult } from './workflow_engine';

describe('Workflow Engine', () => {
  let workflow: Workflow;

  beforeEach(() => {
    workflow = new Workflow('TestWorkflow');
  });

  test('should execute steps in order', async () => {
    const executionOrder: string[] = [];

    workflow.step('step1', {
      handler: async (input: any) => {
        executionOrder.push('step1');
        return { success: true, data: { val: input.start + 1 } };
      }
    });

    workflow.step('step2', {
      handler: async (data: any) => {
        executionOrder.push('step2');
        return { success: true, data: { val: data.step1.val + 1 } };
      }
    });

    const result = await workflow.execute({ start: 0 });

    expect(result.success).toBe(true);
    expect(executionOrder).toEqual(['step1', 'step2']);
    expect(result.data.step2.val).toBe(2);
  });

  test('should stop execution on failure', async () => {
    workflow.step('step1', {
      handler: async () => {
        return { success: false, error: 'Failed' };
      }
    });

    workflow.step('step2', {
      handler: async () => {
        return { success: true, data: {} };
      }
    });

    const result = await workflow.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed');
    expect(result.lastStep).toBe('step1');
  });

  test('should retry failed steps', async () => {
    let attempts = 0;

    workflow.step('flaky', {
      retries: 3,
      retryDelay: 10,
      handler: async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Fail');
        }
        return { success: true, data: 'Success' };
      }
    });

    const result = await workflow.execute({});

    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
    expect(result.data.flaky).toBe('Success');
  });
});
