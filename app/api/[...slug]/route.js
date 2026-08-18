import { NextResponse } from 'next/server';
import { handleProjects } from '../../../backend/api/projects.js';
import { handleEmployees } from '../../../backend/api/employees.js';
import { handleAssignments } from '../../../backend/api/assignments.js';
import { handleTimesheets } from '../../../backend/api/timesheets.js';
import { handleMilestones } from '../../../backend/api/milestones.js';
import { handleInvoices } from '../../../backend/api/invoices.js';
import { handleNotifications } from '../../../backend/api/notifications.js';
import { handleSeed } from '../../../backend/api/seed.js';
import { handleAuth } from '../../../backend/api/auth.js';

async function routeHandler(req, { params }) {
  const slug = params.slug || [];
  const entity = slug[0];
  const subSegments = slug.slice(1);
  const searchParams = req.nextUrl.searchParams;

  try {
    let result = { status: 404, body: { error: 'Route not found' } };

    switch (entity) {
      case 'auth':
        result = await handleAuth(req, subSegments);
        break;
      case 'projects':
        result = await handleProjects(req, subSegments, searchParams);
        break;
      case 'employees':
        result = await handleEmployees(req, subSegments, searchParams);
        break;
      case 'assignments':
        result = await handleAssignments(req, subSegments, searchParams);
        break;
      case 'timesheets':
        result = await handleTimesheets(req, subSegments, searchParams);
        break;
      case 'milestones':
        result = await handleMilestones(req, subSegments, searchParams);
        break;
      case 'invoices':
        result = await handleInvoices(req, subSegments, searchParams);
        break;
      case 'notifications':
        result = await handleNotifications(req, subSegments, searchParams);
        break;
      case 'seed':
        result = await handleSeed(req);
        break;
      default:
        result = { status: 404, body: { error: `API resource '${entity}' not recognized` } };
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error(`API Error on /api/${slug.join('/')}:`, error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = routeHandler;
export const POST = routeHandler;
export const PUT = routeHandler;
export const DELETE = routeHandler;
