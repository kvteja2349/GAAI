export interface ImageGenOptions {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  model?: string;
}

export interface ImageGenResult {
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  provider: string;
  width: number;
  height: number;
  createdAt: string;
}

export class ImageGenService {
  /**
   * Generates genuine AI image via Pollinations.ai Flux engine (100% Free, real AI generation)
   * or configured external OpenAI/HF endpoint.
   */
  public static async generateImage(options: ImageGenOptions): Promise<ImageGenResult> {
    const prompt = options.prompt.trim();
    if (!prompt) {
      throw new Error('Image prompt cannot be empty.');
    }

    let width = 1024;
    let height = 1024;

    switch (options.aspectRatio) {
      case '16:9':
        width = 1280;
        height = 720;
        break;
      case '9:16':
        width = 720;
        height = 1280;
        break;
      case '4:3':
        width = 1024;
        height = 768;
        break;
      case '1:1':
      default:
        width = 1024;
        height = 1024;
        break;
    }

    // Check if custom OPENAI_BASE_URL or DALL-E key is configured
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && !openaiKey.includes('placeholder')) {
      try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            prompt,
            n: 1,
            size: `${width}x${height}`
          })
        });
        if (res.ok) {
          const data: any = await res.json();
          const url = data.data?.[0]?.url;
          if (url) {
            return {
              imageUrl: url,
              prompt,
              aspectRatio: options.aspectRatio || '1:1',
              provider: 'OpenAI DALL-E',
              width,
              height,
              createdAt: new Date().toISOString()
            };
          }
        }
      } catch {
        // Fall back to Pollinations Flux
      }
    }

    // Free high-quality Pollinations Flux endpoint
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;

    // Verify endpoint returns valid image response
    const headCheck = await fetch(imageUrl, { method: 'HEAD' });
    if (!headCheck.ok) {
      throw new Error(`Image generation failed: provider returned status ${headCheck.status}`);
    }

    return {
      imageUrl,
      prompt,
      aspectRatio: options.aspectRatio || '1:1',
      provider: 'Pollinations AI (Flux.1)',
      width,
      height,
      createdAt: new Date().toISOString()
    };
  }
}
