import { createWorkspace } from "./workspace.repository.js";

export async function createNewWorkspace(userId: string, name: string, defaultModel: string){
  return createWorkspace(userId, name, defaultModel);
}