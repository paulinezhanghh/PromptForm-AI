import React, { useState, useCallback } from 'react';
import { InputForm } from './components/InputForm';
import { OutputDisplay } from './components/OutputDisplay';
import type { FormData, GeneratedContent, ProductImage } from './types';
import { generateQuestionnaire, refineQuestionnaire } from './services/geminiService';
import { LogoIcon } from './components/icons';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    researchType: 'Generative Interview',
    targetAudience: 'End Users',
    goalFocus: 'Identify Pain Points',
    productStage: 'Idea',
    tone: 'Formal',
    productInfo: '',
    productImages: [],
  });
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageAdd = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      // Basic duplicate check by original filename
      if (formData.productImages.some(img => img.name.startsWith(file.name))) {
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        const newImage: ProductImage = {
          data: base64String,
          mimeType: file.type,
          // Create a unique name for keys and removal
          name: `${file.name}-${Date.now()}`,
        };
        setFormData(prev => ({
          ...prev,
          productImages: [...prev.productImages, newImage],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageRemove = (imageName: string) => {
    setFormData(prev => ({
      ...prev,
      productImages: prev.productImages.filter(img => img.name !== imageName),
    }));
  };

  const handleGenerate = useCallback(async (newTone?: string) => {
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    try {
      const submissionData = { ...formData, tone: newTone || formData.tone };
      const content = await generateQuestionnaire(submissionData);
      setGeneratedContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  const handleRefine = useCallback(async (refinementPrompt: string) => {
    if (!generatedContent) return;

    setIsRefining(true);
    setError(null);
    try {
      const refinedContent = await refineQuestionnaire(formData, generatedContent, refinementPrompt);
      setGeneratedContent(refinedContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during refinement.');
      console.error(err);
    } finally {
      setIsRefining(false);
    }
  }, [formData, generatedContent]);
  
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      <header className="bg-slate-950/80 backdrop-blur-lg sticky top-0 z-20 border-b border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <LogoIcon className="h-8 w-8 text-sky-400" />
              <h1 className="text-xl font-bold tracking-tight text-slate-100">PromptForm AI</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <aside className="lg:col-span-4 xl:col-span-3">
            <InputForm
              formData={formData}
              onFormChange={handleFormChange}
              onAddImages={handleImageAdd}
              onRemoveImage={handleImageRemove}
              onGenerate={() => handleGenerate()}
              isLoading={isLoading}
            />
          </aside>
          <section className="lg:col-span-8 xl:col-span-9">
            <OutputDisplay
              content={generatedContent}
              isLoading={isLoading}
              isRefining={isRefining}
              error={error}
              setContent={setGeneratedContent}
              onRegenerateWithTone={handleGenerate}
              onRefine={handleRefine}
            />
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;