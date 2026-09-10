export const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "AI Lyrics Generator & Multi-Agent Songwriting Studio API",
    version: "2.0.0",
    description: "Production-ready Model-Agnostic REST API for AI Songwriting, Multi-Agent Orchestration, Rhyme Analysis, Chord Architecture, and Commercial Virality Auditing. Supports Gemini, Claude 3.7, OpenAI GPT-4o, DeepSeek, Groq, OpenRouter, and Ollama.",
    contact: {
      name: "AI Lyrics Generator Studio",
      url: "https://ai-lyrics-generator.studio"
    }
  },
  servers: [
    {
      url: "http://localhost:3005/api",
      description: "Local Development Server"
    }
  ],
  security: [],
  components: {
    securitySchemes: {
      BearerToken: {
        type: "http",
        scheme: "bearer",
        description: "Required on all mutating (POST) endpoints when the server runs with API_ACCESS_TOKEN set. Send as `Authorization: Bearer <token>` (or `x-api-key: <token>`). When API_ACCESS_TOKEN is unset the API is open (local development)."
      }
    }
  },
  tags: [
    { name: "system", description: "Health, models, and documentation" },
    { name: "generation", description: "Lyrics, pipelines, writer's room, tools, artwork" }
  ],
  paths: {
    "/health": {
      get: {
        summary: "API Health & Uptime Check",
        description: "Returns server status, timestamp, and active LLM configuration.",
        responses: {
          "200": {
            description: "Service is healthy and online",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    version: { type: "string", example: "2.0.0" },
                    timestamp: { type: "number" },
                    uptime: { type: "number" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/models/list": {
      get: {
        tags: ["system"],
        summary: "List Supported LLM Providers & Models",
        description: "Returns the models the server dispatcher can resolve: the built-in catalog (Google Gemini, Claude, GPT-4o, DeepSeek, Groq, Ollama, OpenRouter) plus any models registered at runtime via POST /models/register (in-memory, lost on restart). Browser clients may additionally merge their own localStorage registry — that client-side extension is NOT visible to this endpoint.",
        responses: {
          "200": {
            description: "Array of model definitions plus registered custom model ids",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    models: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          provider: { type: "string" },
                          modelString: { type: "string" },
                          endpointUrl: { type: "string" },
                          contextWindow: { type: "number" },
                          supportsTools: { type: "boolean" },
                          pricingTier: { type: "string" },
                          speedTier: { type: "string" }
                        }
                      }
                    },
                    serverCustomModels: {
                      type: "array",
                      items: { type: "string" },
                      description: "Ids of models registered via POST /models/register"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/models/register": {
      post: {
        tags: ["system"],
        summary: "Register a Server-Side Model Definition",
        description: "Adds (or replaces by id) a model the server dispatcher can use. In-memory only (lost on restart). API keys are NOT accepted — provider keys come from the Node environment. Requires Authorization when API_ACCESS_TOKEN is set.",
        security: [{ BearerToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id", "name", "provider", "modelString"],
                properties: {
                  id: { type: "string", pattern: "^[a-zA-Z0-9_.\\-]{1,64}$", example: "my_custom_gateway" },
                  name: { type: "string", example: "My Custom Gateway Model" },
                  provider: { type: "string", enum: ["google_gemini", "openai", "anthropic", "deepseek", "groq", "openrouter", "ollama_local", "nous_hermes", "openai_compatible", "anthropic_compatible"] },
                  modelString: { type: "string", example: "my-model-v1" },
                  endpointUrl: { type: "string", example: "https://api.example.com/v1/chat/completions" },
                  contextWindow: { type: "number", example: 64000 },
                  supportsTools: { type: "boolean" },
                  description: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Model registered (or replaced by id)",
            content: { "application/json": { schema: { type: "object", properties: { registered: { type: "boolean" }, model: { type: "object" } } } } }
          },
          "400": { description: "Invalid model definition or invalid JSON body" },
          "401": { description: "Missing/invalid API_ACCESS_TOKEN" }
        }
      }
    },
    "/generate-artwork": {
      post: {
        tags: ["generation"],
        summary: "Generate Album Artwork Image (Gemini Image Model)",
        description: "Server-side image generation via a Gemini image model (override with GEMINI_IMAGE_MODEL env). Returns a base64 image payload on success, or generated:false with a reason and a suggested 'procedural-canvas' fallback when the image model is unavailable (e.g. no GEMINI_API_KEY). Requires Authorization when API_ACCESS_TOKEN is set.",
        security: [{ BearerToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt"],
                properties: {
                  prompt: { type: "string", example: "A stunning vinyl album cover for a synthwave song titled 'Midnight Echoes'..." }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Image generated (generated:true + base64 imageData) or explicit refusal with reason (generated:false)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    generated: { type: "boolean" },
                    model: { type: "string" },
                    mimeType: { type: "string" },
                    imageData: { type: "string", description: "base64 image bytes (no data: prefix)" },
                    reason: { type: "string" },
                    fallback: { type: "string", enum: ["procedural-canvas"] }
                  }
                }
              }
            }
          },
          "400": { description: "Missing/invalid prompt or invalid JSON body" },
          "401": { description: "Missing/invalid API_ACCESS_TOKEN" },
          "502": { description: "Image model unavailable or returned no image" }
        }
      }
    },
    "/models/test-connection": {
      post: {
        tags: ["system"],
        summary: "Test Connection & Ping LLM Provider",
        description: "Pings a model endpoint with a minimal test token payload and returns exact roundtrip latency. Requires Authorization when API_ACCESS_TOKEN is set.",
        security: [{ BearerToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  modelId: { type: "string", example: "gemini_2_5_flash" }
                },
                required: ["modelId"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Connection status result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    modelId: { type: "string" },
                    status: { type: "string", enum: ["untested", "connected", "error"] },
                    latencyMs: { type: "number", example: 215 },
                    lastTested: { type: "number" },
                    errorMessage: { type: "string" }
                  }
                }
              }
            }
          },
          "400": {
            description: "Missing/invalid modelId or invalid JSON body",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" }
                  }
                }
              }
            }
          },
          "401": { description: "Missing/invalid API_ACCESS_TOKEN" }
        }
      }
    },
    "/agents/list": {
      get: {
        summary: "List Active Agent Profiles",
        description: "Returns all specialized music agents (Hermes, Apollo, Harmonia, Calliope, Clio, Quincy, Iris) with their system prompts and tool access.",
        responses: {
          "200": {
            description: "List of available agents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    agents: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          title: { type: "string" },
                          role: { type: "string" },
                          category: { type: "string" },
                          allowedTools: { type: "array", items: { type: "string" } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/generate-lyrics": {
      post: {
        tags: ["generation"],
        summary: "Generate Complete Song Lyrics",
        description: "Synthesizes multi-section song lyrics across genres and styles using any selected LLM provider. Requires Authorization when API_ACCESS_TOKEN is set.",
        security: [{ BearerToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  theme: { type: "string", example: "Late night highway drive under neon rain" },
                  genre: { type: "string", example: "Synthwave Pop" },
                  mood: { type: "string", example: "Nostalgic & Euphoric" },
                  occasion: { type: "string", example: "Road Trip" },
                  rhymeScheme: { type: "string", example: "ABAB / AABB" },
                  language: { type: "string", example: "English" },
                  modelId: { type: "string", example: "gemini_2_5_flash" },
                  styleNote: { type: "string", example: "Heavy 80s analog synths, rhythmic punch" }
                },
                required: ["theme", "genre", "mood"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Song lyrics output and metadata",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    lyricsText: { type: "string" },
                    genre: { type: "string" },
                    mood: { type: "string" },
                    modelUsed: { type: "string" },
                    generatedAt: { type: "number" }
                  }
                }
              }
            }
          },
          "400": {
            description: "Missing required fields (theme, genre, mood) or invalid JSON body",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" }
                  }
                }
              }
            }
          },
          "401": { description: "Missing/invalid API_ACCESS_TOKEN" },
          "502": {
            description: "LLM provider unavailable — no lyrics were generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    detail: { type: "string" },
                    modelRequested: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/agents/execute-pipeline": {
      post: {
        tags: ["generation"],
        summary: "Execute Multi-Agent Orchestration Pipeline",
        description: "Runs a sequential pipeline chaining multiple specialized agents together (e.g. Trend Synthesis -> Lyricist -> Chord Master -> A&R Polish). pipelineId defaults to full_hitmaker_pipeline when omitted. Agents' registered tools are advertised in their prompts and apply_to_current_song executes for real (recorded in log toolCalls). Requires Authorization when API_ACCESS_TOKEN is set.",
        security: [{ BearerToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  pipelineId: { type: "string", example: "full_hitmaker_pipeline", enum: ["full_hitmaker_pipeline", "quick_hook_harmony", "ar_song_doctor"], default: "full_hitmaker_pipeline" },
                  title: { type: "string", example: "Midnight Reverie" },
                  genre: { type: "string", example: "Pop" },
                  mood: { type: "string", example: "Euphoric" },
                  theme: { type: "string", example: "Chasing dreams in the city" },
                  key: { type: "string", example: "C Major" },
                  existingLyrics: { type: "string" },
                  customIdeas: { type: "string", description: "Production notes from the songwriter; injected into prompts and available as {{customIdeas}} in stage templates" }
                },
                required: ["title", "genre", "theme"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Pipeline execution logs and final outputs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    pipelineId: { type: "string" },
                    status: { type: "string", example: "completed", enum: ["idle", "running", "completed", "error"] },
                    totalStages: { type: "number" },
                    logs: { type: "array", items: { type: "object" } },
                    finalOutputs: { type: "object" },
                    error: { type: "string" }
                  }
                }
              }
            }
          },
          "400": {
            description: "Unknown pipelineId or missing required fields",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    validPipelineIds: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          },
          "401": { description: "Missing/invalid API_ACCESS_TOKEN" },
          "502": {
            description: "Pipeline failed (e.g. LLM provider unavailable)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    pipelineId: { type: "string" },
                    status: { type: "string", example: "error" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/agents/writers-room": {
      post: {
        tags: ["generation"],
        summary: "Collaborative Writer's Room Agent Turn",
        description: "Engage in multi-agent discussion or request feedback from a specific agent in the virtual studio. The agent's song context (including customIdeas as PRODUCTION NOTES) is injected into its system prompt. Requires Authorization when API_ACCESS_TOKEN is set.",
        security: [{ BearerToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  targetAgentId: { type: "string", example: "hermes_lyricist" },
                  userMessage: { type: "string", example: "Can you rewrite the chorus to make it punchier for TikTok?" },
                  conversationHistory: { type: "array", items: { type: "object" } },
                  songContext: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      genre: { type: "string" },
                      mood: { type: "string" },
                      lyricsSnippet: { type: "string" },
                      customIdeas: { type: "string", description: "Production notes shown to the agent under 'PRODUCTION NOTES'" }
                    }
                  }
                },
                required: ["targetAgentId", "userMessage"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Agent response message",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    agentId: { type: "string" },
                    agentName: { type: "string" },
                    content: { type: "string" },
                    timestamp: { type: "number" }
                  }
                }
              }
            }
          },
          "400": {
            description: "Missing required 'userMessage' or invalid JSON body",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" }
                  }
                }
              }
            }
          },
          "401": { description: "Missing/invalid API_ACCESS_TOKEN" }
        }
      }
    },
    "/llm/complete": {
      post: {
        tags: ["generation"],
        summary: "Server-side LLM Completion Proxy",
        description: "Runs a single LLM call server-side so provider API keys stay in the Node environment (never shipped to the browser). Set API_ACCESS_TOKEN to require an Authorization: Bearer header.",
        security: [{ BearerToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  modelId: { type: "string", example: "gemini_2_5_flash" },
                  systemPrompt: { type: "string" },
                  userPrompt: { type: "string" },
                  temperature: { type: "number" },
                  maxTokens: { type: "number" },
                  responseFormat: { type: "string", enum: ["text", "json"] }
                },
                required: ["userPrompt"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Completion text from the requested provider",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    modelId: { type: "string", nullable: true }
                  }
                }
              }
            }
          },
          "400": { description: "Invalid request body" },
          "401": { description: "Missing/invalid API_ACCESS_TOKEN" },
          "502": { description: "LLM provider unavailable" }
        }
      }
    },
    "/agents/tools/execute": {
      post: {
        tags: ["generation"],
        summary: "Execute Specific Music Agent Tool",
        description: "Run specialized songwriting tools directly. Includes simulate_music_trends (knowledge-based trend synthesis — NOT live web research; legacy id search_web_music_trends is still accepted), rhyme analyzer, chord architect, melody motif builder, art direction, and apply_to_current_song. Requires Authorization when API_ACCESS_TOKEN is set.",
        security: [{ BearerToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  toolId: { type: "string", example: "chord_progression_architect" },
                  parameters: { type: "object" },
                  modelId: { type: "string", example: "gemini_2_5_flash" }
                },
                required: ["toolId", "parameters"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Tool execution result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    toolId: { type: "string" },
                    success: { type: "boolean" },
                    data: { type: "object" },
                    summaryText: { type: "string" }
                  }
                }
              }
            }
          },
          "400": { description: "Invalid request body or unknown toolId" },
          "401": { description: "Missing/invalid API_ACCESS_TOKEN" }
        }
      }
    }
  }
};
