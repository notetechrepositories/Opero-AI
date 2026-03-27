import { useState } from "react";
import { analyzeImage } from "../services/ticketService";

const useImageAnalysis = (setFormData) => {
    const [selectedImage, setSelectedImage]   = useState(null);
    const [imagePreview, setImagePreview]     = useState(null);
    const [isAnalyzing, setIsAnalyzing]       = useState(false);
    const [aiError, setAiError]               = useState(null);
    const [isDragOver, setIsDragOver]         = useState(false);

    const [didUserEditMessage,  setDidUserEditMessage]  = useState(false);
    const [didUserEditCategory, setDidUserEditCategory] = useState(false);
    const [didUserEditPriority, setDidUserEditPriority] = useState(false);

    const processImageFile = async (file) => {
        if (!file) return;

        if (!["image/jpeg", "image/png"].includes(file.type)) {
            alert("Please upload only JPG or PNG images.");
            return;
        }

        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
        setAiError(null);
        setIsAnalyzing(true);

        try {
            const { issue, category, priority, image_url } = await analyzeImage(file);

            setFormData(prev => ({
                ...prev,
                image_url: image_url || prev.image_url,
                message:  (prev.message  || "").trim() === "" || !didUserEditMessage  ? (issue    || prev.message)  : prev.message,
                category: (prev.category || "").trim() === "" || !didUserEditCategory ? (category || prev.category) : prev.category,
                priority: (prev.priority || "").trim() === "" || !didUserEditPriority ? (priority || prev.priority) : prev.priority,
            }));
        } catch (err) {
            console.error("AI Analysis failed", err);
            const detail = err?.response?.data?.detail;
            setAiError(detail ? `AI analysis failed: ${detail}` : "AI analysis failed. Please fill the fields manually.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        processImageFile(file);
    };

    const resetImageState = () => {
        setSelectedImage(null);
        setImagePreview(null);
        setAiError(null);
        setIsDragOver(false);
        setDidUserEditMessage(false);
        setDidUserEditCategory(false);
        setDidUserEditPriority(false);
    };

    return {
        selectedImage,
        imagePreview,
        isAnalyzing,
        aiError,
        isDragOver,
        setIsDragOver,
        didUserEditMessage,
        didUserEditCategory,
        didUserEditPriority,
        setDidUserEditMessage,
        setDidUserEditCategory,
        setDidUserEditPriority,
        processImageFile,
        handleImageChange,
        resetImageState,
    };
};

export default useImageAnalysis;
