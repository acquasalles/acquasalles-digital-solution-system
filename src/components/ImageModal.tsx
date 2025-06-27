import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { useIntl } from 'react-intl';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  const intl = useIntl();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="relative max-w-4xl w-full bg-white rounded-lg shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="p-1">
          <img
            src={imageUrl}
            alt="Measurement"
            className="w-full h-auto rounded"
            onError={(e) => {
              e.currentTarget.parentElement?.classList.add('image-error');
            }}
          />
          <div className="hidden image-error:flex absolute inset-0 items-center justify-center bg-gray-100 rounded">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">
                {intl.formatMessage({ id: 'imageModal.notAvailable' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}