# Routing-Controllers-OpenAPI-V3 (WIP)

Auto generate document of OpenAPI v3 Spec format.



## Condition & Limitation

1. the param name be decorated by `@QueryParams` should always be `query`
2. the param name be decorated by `@Body` should always be `body`
3. always use class or inherit type as params type, don't use type operator in action function params or `@ResType`
4. every controller should have a base path, which will be output as openapi tag
5. route path should be a string, regex is not supported now
6. set `emitDecoratorMetadata` to `true` in tsconfig.json



## Example

SourceCode:

```typescript
// Model
class Article {
    title: string;
    author: string;
}

// QueryParams class, note that to make this library work, 
// you should always use class instead of interface.
class ArticleQuery {
    limit: number = 10;	// Default value will be output to document~
    offset: number = 0;
}

@JsonController('/article')	// This is required, and will be output as openapi document tag
export class ArticleController {
    @Inject() articleService: ArticleService
    
    @Description('Fetch Article List')	// @Description to mark description
    @ResType([Article])	// [Article] => Article[], Article => Article
    @Get('/')
    async getArticleList(@QueryParams() query: ArticleQuery): Promise<Article[]> {
        return this.articleService.getArticleList(query)
    }
}
```

Usage of this library:

```typescript
import docGenerator from 'routing-controller-openapi-v3'
import { getMetadataArgsStorage } from 'routing-controllers'

docGenerator(getMetadataArgsStorage(), {
  info: {
    title: 'SteamCN-VNext API',
    description: 'API Document for SteamCN-VNext',
    version: '0.7.0'
  },
  servers: [{
    url: 'https://api.example.com/v1',
    description: 'test'
  }]
})
```

Output:

```json
{
    "openapi": "3.0.0",
    "info": {
        "title": "SteamCN-VNext API",
        "description": "API Document for SteamCN-VNext",
        "version": "0.7.0"
    },
    "servers": [
        {
            "url": "https://api.example.com/v1",
            "description": "test"
        }
    ],
    "paths": {
        "/article": {
            "get": {
                "description": "Fetch Article List",
                "tags": [
                    "article"
                ],
                "parameters": [
                    {
                        "in": "query",
                        "name": "limit",
                        "schema": {
                            "type": "number",
                            "default": 10
                        }
                    },
                    {
                        "in": "query",
                        "name": "offset",
                        "schema": {
                            "type": "number",
                            "default": 0
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/components/schemas/Article"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "tags": [
    	{
    		"name": "article"
		  }
    ],
    "components": {
        "schemas": {
            "Article": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string"
                    },
                    "author": {
                        "type": "string"
                    }
                },
                "required": [
                    "title",
                    "author",
                ]
            }
        }
    }
}
```

