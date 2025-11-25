import React, { useRef, useState } from 'react';
import type { FormData, ProductImage } from '../types';
import { RESEARCH_TYPES, TARGET_AUDIENCES, GOAL_FOCUSES, PRODUCT_STAGES, TONES } from '../constants';
import { GenerateIcon, LoadingIcon, CloseIcon } from './icons';

interface InputFormProps {
  formData: FormData;
  onFormChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => void;
  onAddImages: (files: FileList | null) => void;
  onRemoveImage: (imageName: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const SelectInput: React.FC<{ label: string; name: string; value: string; options: string[]; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }> = ({ label, name, value, options, onChange }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="block w-full bg-slate-800 border border-slate-700 rounded-lg shadow-sm py-2.5 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 sm:text-sm transition-colors"
    >
      {options.map(option => <option key={option} value={option.split('(')[0].trim()}>{option}</option>)}
    </select>
  </div>
);

const TextAreaInput: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder: string; }> = ({ label, name, value, onChange, placeholder }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
      <textarea
        id={name}
        name={name}
        rows={4}
        value={value}
        onChange={onChange}
        className="block w-full bg-slate-800 border border-slate-700 rounded-lg shadow-sm py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 sm:text-sm transition-colors resize-y"
        placeholder={placeholder}
      />
    </div>
);

const ImageUpload: React.FC<{
  productImages: ProductImage[];
  onAddImages: (files: FileList | null) => void;
  onRemoveImage: (imageName: string) => void;
}> = ({ productImages, onAddImages, onRemoveImage }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAddImages(e.target.files);
    }
    // Clear the input value to allow re-uploading the same file
    if (inputRef.current) {
        inputRef.current.value = "";
    }
  };
  
  const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>, name: string) => {
    e.stopPropagation();
    onRemoveImage(name);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddImages(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };


  return (
    <div>
      <label className="block text-sm font-medium text-slate-400 mb-1.5">Product Images (Optional)</label>
      
      {productImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
            {productImages.map(image => (
                <div key={image.name} className="relative group aspect-square">
                    <img
                        src={`data:${image.mimeType};base64,${image.data}`}
                        alt={image.name}
                        className="w-full h-full rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <button
                            onClick={(e) => handleRemoveImage(e, image.name)}
                            className="bg-red-600/80 text-white rounded-full p-1.5 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-red-500"
                            aria-label="Remove image"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}

      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-sky-400 bg-sky-900/50'
            : 'border-slate-700 hover:border-sky-500 bg-slate-800/50'
        }`}
      >
        <input
          type="file"
          multiple
          ref={inputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
        />
        <p className="text-sm text-slate-400 pointer-events-none">
          {isDragging ? 'Drop images here' : 'Drag & drop or click to upload'}
        </p>
        <p className="text-xs text-slate-500 mt-1 pointer-events-none">Add one or more images</p>
      </div>
    </div>
  );
};


export const InputForm: React.FC<InputFormProps> = ({ formData, onFormChange, onAddImages, onRemoveImage, onGenerate, isLoading }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl space-y-6 sticky top-24">
      <h2 className="text-lg font-semibold text-slate-100">Generation Parameters</h2>
      <div className="space-y-5">
        <SelectInput label="Research Type" name="researchType" value={formData.researchType} options={RESEARCH_TYPES} onChange={onFormChange} />
        <SelectInput label="Target Audience" name="targetAudience" value={formData.targetAudience} options={TARGET_AUDIENCES} onChange={onFormChange} />
        <SelectInput label="Goal Focus" name="goalFocus" value={formData.goalFocus} options={GOAL_FOCUSES} onChange={onFormChange} />
        <TextAreaInput label="Product Details" name="productInfo" value={formData.productInfo} onChange={onFormChange} placeholder="e.g., A mobile app for booking local fitness classes." />
        <ImageUpload
            productImages={formData.productImages}
            onAddImages={onAddImages}
            onRemoveImage={onRemoveImage}
        />
        <SelectInput label="Stage of Product" name="productStage" value={formData.productStage} options={PRODUCT_STAGES} onChange={onFormChange} />
        <SelectInput label="Tone" name="tone" value={formData.tone} options={TONES} onChange={onFormChange} />
      </div>
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-bold rounded-lg shadow-lg text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-100"
      >
        {isLoading ? (
          <>
            <LoadingIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
            Generating...
          </>
        ) : (
          <>
            <GenerateIcon className="-ml-1 mr-2 h-5 w-5" />
            Generate Script
          </>
        )}
      </button>
    </div>
  );
};
