/**
 * Simple Workflow Engine for ContentSys
 * Replaces the non-existent Mastra Workflow/Step API with a custom implementation
 */

export interface StepResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
}

export interface StepHandler<TInput = any, TOutput = any> {
  (input: TInput): Promise<StepResult<TOutput>>;
}

export interface WorkflowStep<TInput = any, TOutput = any> {
  name: string;
  handler: StepHandler<TInput, TOutput>;
  retries?: number;
  retryDelay?: number;
}

export interface WorkflowResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  stepResults?: Record<string, StepResult>;
  totalDuration?: number;
}

/**
 * Simple sequential workflow executor
 */
export class Workflow {
  private name: string;
  private steps: WorkflowStep[] = [];

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Add a step to the workflow
   */
  step<TInput = any, TOutput = any>(
    name: string, 
    config: { 
      handler: StepHandler<TInput, TOutput>;
      retries?: number;
      retryDelay?: number;
    }
  ): this {
    this.steps.push({
      name,
      handler: config.handler,
      retries: config.retries || 1,
      retryDelay: config.retryDelay || 1000
    });
    return this;
  }

  /**
   * Execute the workflow with the given input
   * Each step receives the accumulated context from previous steps
   */
  async execute<TInput = any>(initialInput: TInput): Promise<WorkflowResult> {
    const startTime = Date.now();
    const stepResults: Record<string, StepResult> = {};
    let context: any = { ...initialInput };

    console.log(`[Workflow:${this.name}] Starting execution with ${this.steps.length} steps`);

    for (const step of this.steps) {
      console.log(`[Workflow:${this.name}] Executing step: ${step.name}`);
      
      let lastError: Error | null = null;
      let result: StepResult | null = null;

      // Retry logic
      for (let attempt = 1; attempt <= (step.retries || 1); attempt++) {
        try {
          result = await step.handler(context);
          
          if (result.success) {
            break;
          } else {
            lastError = new Error(result.error || 'Step failed');
            if (attempt < (step.retries || 1)) {
              console.log(`[Workflow:${this.name}] Step ${step.name} failed, retrying (${attempt}/${step.retries})...`);
              await this.delay(step.retryDelay || 1000);
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt < (step.retries || 1)) {
            console.log(`[Workflow:${this.name}] Step ${step.name} threw error, retrying (${attempt}/${step.retries})...`);
            await this.delay(step.retryDelay || 1000);
          }
        }
      }

      // Store step result
      stepResults[step.name] = result || {
        success: false,
        error: lastError?.message || 'Unknown error'
      };

      // Check if step succeeded
      if (!result?.success) {
        console.log(`[Workflow:${this.name}] Step ${step.name} failed after all retries`);
        return {
          success: false,
          error: `Step '${step.name}' failed: ${lastError?.message || 'Unknown error'}`,
          stepResults,
          totalDuration: Date.now() - startTime
        };
      }

      // Merge step result into context for next step
      context = {
        ...context,
        [step.name]: result.data,
        queueId: context.queueId, // Preserve queueId
        tenantId: context.tenantId // Preserve tenantId
      };

      console.log(`[Workflow:${this.name}] Step ${step.name} completed successfully`);
    }

    console.log(`[Workflow:${this.name}] Workflow completed successfully`);

    return {
      success: true,
      data: context,
      stepResults,
      totalDuration: Date.now() - startTime
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a new workflow
 */
export function createWorkflow(name: string): Workflow {
  return new Workflow(name);
}
