import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Constants
const ASANA_API_BASE = "https://app.asana.com/api/1.0";

// Create server instance
const server = new McpServer({
  name: "asana",
  version: "1.0.0",
});

// Helper function for making authenticated Asana API requests
async function makeAsanaRequest(endpoint: string, method = 'GET', body?: any) {
  const token = process.env.ASANA_ACCESS_TOKEN;
  if (!token) {
    throw new Error("ASANA_ACCESS_TOKEN environment variable is required");
  }

  const url = `${ASANA_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error making Asana request:", error);
    throw error;
  }
}

// Helper function to format task data
function formatTaskData(task: any) {
  return {
    id: task.gid,
    name: task.name,
    completed: task.completed,
    notes: task.notes,
    due_on: task.due_on,
    assignee: task.assignee?.name,
    assignee_id: task.assignee?.gid,
    parent: task.parent?.name,
    parent_id: task.parent?.gid,
    section: task.memberships?.[0]?.section?.name,
    section_id: task.memberships?.[0]?.section?.gid,
    project: task.memberships?.[0]?.project?.name,
    project_id: task.memberships?.[0]?.project?.gid,
  };
}

// Tool to list all projects (converted from resource)
server.tool(
  "list-projects",
  {},
  async () => {
    try {
      const data = await makeAsanaRequest("/projects");
      return {
        content: [{
          type: "text",
          text: JSON.stringify(data.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to list projects: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Tool to get project details including tasks and sections (converted from resource)
server.tool(
  "get-project-details",
  {
    projectId: z.string()
  },
  async ({ projectId }) => {
    try {
      const [projectData, tasksData, sectionsData] = await Promise.all([
        makeAsanaRequest(`/projects/${projectId}`),
        makeAsanaRequest(`/projects/${projectId}/tasks`),
        makeAsanaRequest(`/projects/${projectId}/sections`)
      ]);
      
      const combinedData = {
        project: projectData.data,
        sections: sectionsData.data,
        tasks: tasksData.data
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(combinedData, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to get project details: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Tool to get task details including subtasks (converted from resource)
server.tool(
  "get-task-details",
  {
    taskId: z.string()
  },
  async ({ taskId }) => {
    try {
      const [taskData, subtasksData] = await Promise.all([
        makeAsanaRequest(`/tasks/${taskId}`),
        makeAsanaRequest(`/tasks/${taskId}/subtasks`)
      ]);

      const formattedData = {
        task: formatTaskData(taskData.data),
        subtasks: subtasksData.data.map(formatTaskData)
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(formattedData, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to get task details: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Tool to create a new task
server.tool(
  "create-task",
  {
    projectId: z.string(),
    name: z.string(),
    notes: z.string().optional(),
    dueOn: z.string().optional(),
    assigneeId: z.string().optional(),
    parentTaskId: z.string().optional(),
    sectionId: z.string().optional(),
  },
  async ({ projectId, name, notes, dueOn, assigneeId, parentTaskId, sectionId }) => {
    try {
      const taskData = {
        name,
        projects: [projectId],
        notes: notes || undefined,
        due_on: dueOn || undefined,
        assignee: assigneeId || undefined,
        parent: parentTaskId || undefined,
      };

      const data = await makeAsanaRequest('/tasks', 'POST', { data: taskData });
      
      // If a section is specified, move the task to that section
      if (sectionId) {
        await makeAsanaRequest(
          `/sections/${sectionId}/addTask`,
          'POST',
          {
            data: {
              task: data.data.gid
            }
          }
        );
      }

      return {
        content: [{
          type: "text",
          text: `Task created successfully:\n${JSON.stringify(formatTaskData(data.data), null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to create task: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Tool to create a new section
server.tool(
  "create-section",
  {
    projectId: z.string(),
    name: z.string(),
    insertBefore: z.string().optional(),
    insertAfter: z.string().optional(),
  },
  async ({ projectId, name, insertBefore, insertAfter }) => {
    try {
      const data = await makeAsanaRequest(
        `/projects/${projectId}/sections`,
        'POST',
        {
          data: {
            name,
            insert_before: insertBefore || undefined,
            insert_after: insertAfter || undefined,
          }
        }
      );

      return {
        content: [{
          type: "text",
          text: `Section created successfully:\n${JSON.stringify(data.data, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to create section: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Tool to update task
server.tool(
  "update-task",
  {
    taskId: z.string(),
    name: z.string().optional(),
    notes: z.string().optional(),
    dueOn: z.string().optional(),
    completed: z.boolean().optional(),
    assigneeId: z.string().optional(),
  },
  async ({ taskId, name, notes, dueOn, completed, assigneeId }) => {
    try {
      const data = await makeAsanaRequest(
        `/tasks/${taskId}`,
        'PUT',
        {
          data: {
            name: name || undefined,
            notes: notes || undefined,
            due_on: dueOn || undefined,
            completed: completed || undefined,
            assignee: assigneeId || undefined,
          }
        }
      );

      return {
        content: [{
          type: "text",
          text: `Task updated successfully:\n${JSON.stringify(formatTaskData(data.data), null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to update task: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Tool to move task to section
server.tool(
  "move-task",
  {
    taskId: z.string(),
    projectId: z.string(),
    sectionId: z.string(),
  },
  async ({ taskId, projectId, sectionId }) => {
    try {
      await makeAsanaRequest(
        `/sections/${sectionId}/addTask`,
        'POST',
        {
          data: {
            task: taskId,
            project: projectId
          }
        }
      );

      return {
        content: [{
          type: "text",
          text: `Task moved successfully to new section`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to move task: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Tool to search tasks
server.tool(
  "search-tasks",
  {
    workspace: z.string(),
    text: z.string(),
    completed: z.boolean().optional(),
    assignedToUser: z.string().optional(),
  },
  async ({ workspace, text, completed, assignedToUser }) => {
    try {
      let searchUrl = `/workspaces/${workspace}/tasks/search?text=${encodeURIComponent(text)}`;
      if (completed !== undefined) {
        searchUrl += `&completed=${completed}`;
      }
      if (assignedToUser) {
        searchUrl += `&assigned_to=${assignedToUser}`;
      }

      const data = await makeAsanaRequest(searchUrl);
      const formattedTasks = data.data.map(formatTaskData);

      return {
        content: [{
          type: "text",
          text: `Search results:\n${JSON.stringify(formattedTasks, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to search tasks: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Tool to add subtask
server.tool(
  "create-subtask",
  {
    parentTaskId: z.string(),
    name: z.string(),
    notes: z.string().optional(),
    dueOn: z.string().optional(),
    assigneeId: z.string().optional(),
  },
  async ({ parentTaskId, name, notes, dueOn, assigneeId }) => {
    try {
      const data = await makeAsanaRequest(
        '/tasks',
        'POST',
        {
          data: {
            name,
            parent: parentTaskId,
            notes: notes || undefined,
            due_on: dueOn || undefined,
            assignee: assigneeId || undefined,
          }
        }
      );

      return {
        content: [{
          type: "text",
          text: `Subtask created successfully:\n${JSON.stringify(formatTaskData(data.data), null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to create subtask: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Asana MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});