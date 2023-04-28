import { CallbackManager } from "langchain/callbacks";

import { AgentManager } from "agent-mimir";
import chalk from "chalk";

import { BaseChatModel } from 'langchain/chat_models';
import { BaseLanguageModel } from "langchain/base_language";
import { Tool } from "langchain/tools";
import { chatWithAgent } from "./chat.js";

const callbackManager = function (name:string) {
    return CallbackManager.fromHandlers({
        handleLLMStart: async (llm: { name: string }, prompts: string[]) => {
            console.log(chalk.yellow(`####################${name} INPUT#######################`));
            console.log(prompts[0]);
            console.log(chalk.yellow("###################################################"));
        },
        handleLLMEnd: async () => {
        },
        handleLLMError: async (err: Error) => {
            console.log(chalk.red(`####################${name} ERROR#######################`));
            console.log(err);
            console.log(chalk.red("###################################################"));
        },
    });
}

export type AgentDefinition = {
    mainAgent?: boolean;
    profession: string;
    chatModel: BaseChatModel;
    summaryModel: BaseChatModel;
    taskModel: BaseLanguageModel;
    chatHistory?: {
        maxChatHistoryWindow?: number,
        maxTaskHistoryWindow?: number,
    }
    tools: Tool[];
}
type AgentMimirConfig = {
    agents: Record<string, AgentDefinition>;
    continuousMode?: boolean;
}
export const run = async () => {

    const agentConfig: AgentMimirConfig = (await import(process.env.MIMIR_CFG ?? 'mimir-cfg.js')).default()
    const agentManager = new AgentManager();
    const continousMode = agentConfig.continuousMode ?? false;
    const agents = await Promise.all(Object.entries(agentConfig.agents).map(async ([agentName, agentDefinition]) => {
        return {
            mainAgent: agentDefinition.mainAgent,
            name: agentName,
            agent: await agentManager.createAgent({
                name: agentName,
                profession: agentDefinition.profession,
                tools: agentDefinition.tools,
                model: agentDefinition.chatModel,
                summaryModel: agentDefinition.summaryModel,
                thinkingModel: agentDefinition.taskModel,
                chatHistory: agentDefinition.chatHistory,
            })
        }
    }));

    const mainAgent = agents.length === 1 ? agents[0].agent : agents.find(a => a.mainAgent)?.agent;
    if (!mainAgent) {
        throw new Error("No main agent found");
    }

    console.log("Created main agent:: " + mainAgent.name);
    await chatWithAgent(continousMode, mainAgent);
};

run();