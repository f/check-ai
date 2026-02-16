/**
 * 📦 AI Dependencies — detects AI SDK usage in the project.
 */

export const section = 'AI Deps';

// AI-related npm packages
const AI_PACKAGES = new Set([
  'openai',
  '@openai/agents',
  '@anthropic-ai/sdk',
  '@anthropic-ai/bedrock-sdk',
  'langchain',
  '@langchain/core',
  '@langchain/openai',
  '@langchain/anthropic',
  'llamaindex',
  'ai',
  '@ai-sdk/openai',
  '@ai-sdk/anthropic',
  '@ai-sdk/google',
  '@google/generative-ai',
  '@google-cloud/vertexai',
  'ollama',
  'ollama-ai-provider',
  'cohere-ai',
  'replicate',
  'huggingface',
  '@huggingface/inference',
  '@modelcontextprotocol/sdk',
  '@modelcontextprotocol/server-stdio',
  'chromadb',
  'pinecone',
  '@pinecone-database/pinecone',
  'weaviate-ts-client',
  'tiktoken',
  'gpt-tokenizer',
  'js-tiktoken',
]);

// AI-related Python packages
const AI_PY_PACKAGES = [
  'openai',
  'anthropic',
  'langchain',
  'llama-index',
  'llamaindex',
  'transformers',
  'torch',
  'tensorflow',
  'keras',
  'chromadb',
  'pinecone-client',
  'weaviate-client',
  'crewai',
  'autogen',
  'smolagents',
  'mcp',
];

export const checks = [
  {
    id: 'ai-deps',
    label: 'AI SDK dependencies',
    section,
    weight: 4,
    paths: [],
    type: 'custom',
    custom: 'ai-deps',
    description: 'Project uses AI SDKs (OpenAI, Anthropic, LangChain, etc.)',
  },
];

/**
 * Custom check handler for this audit.
 */
export function analyze(rootDir, ctx) {
  const results = {};

  results['ai-deps'] = (() => {
    const found = [];

    // package.json
    const pkgPath = ctx.join(rootDir, 'package.json');
    if (ctx.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(ctx.readFileSafe(pkgPath));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const dep of Object.keys(allDeps)) {
          if (AI_PACKAGES.has(dep)) found.push(dep);
        }
      } catch {
        /* ignore */
      }
    }

    // requirements.txt / pyproject.toml
    for (const reqFile of ['requirements.txt', 'pyproject.toml']) {
      const reqPath = ctx.join(rootDir, reqFile);
      if (ctx.existsSync(reqPath)) {
        const content = ctx.readFileSafe(reqPath).toLowerCase();
        for (const pkg of AI_PY_PACKAGES) {
          if (content.includes(pkg)) found.push(pkg);
        }
      }
    }

    return {
      found: found.length > 0,
      matches: found,
      detail: found.length > 0 ? found.join(', ') : null,
    };
  })();

  return results;
}
