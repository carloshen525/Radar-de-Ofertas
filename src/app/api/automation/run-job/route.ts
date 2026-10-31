import { NextResponse } from 'next/server';
import { automationEngine } from '@/services/scheduler/AutomationEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { job } = body;

    let result;
    switch (job) {
      case '1':
      case 'search':
        result = await automationEngine.runJob1SearchProducts(body.filters);
        break;
      case '2':
      case 'analyze':
        result = await automationEngine.runJob2AnalyzeOpportunities();
        break;
      case '3':
      case 'ai':
        result = await automationEngine.runJob3GenerateContent();
        break;
      case '4':
      case 'publish':
        result = await automationEngine.runJob4PublishTelegram();
        break;
      case '5':
      case 'report':
        result = await automationEngine.runJob5GenerateReport();
        break;
      case 'full':
      default:
        result = await automationEngine.runFullPipeline();
        break;
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

