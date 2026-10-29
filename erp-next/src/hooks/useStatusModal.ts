import { useState } from "react";

type ModalType = "confirm" | "success" | "error" | "loading";

interface ModalState {
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
}

export const useStatusModal = () => {
    const [state, setState] = useState<ModalState>({
        isOpen: false,
        type: "success",
        title: "",
        message: "",
    });

    const [isLoading, setIsLoading] = useState(false);

    const showSuccess = (title: string, message: string) => {
        setState({
            isOpen: true,
            type: "success",
            title,
            message,
        });
    };

    const showError = (title: string, message: string) => {
        setState({
            isOpen: true,
            type: "error",
            title,
            message,
        });
    };

    const showConfirm = (
        title: string,
        message: string,
        onConfirm: () => void,
        confirmLabel = "Confirm",
        cancelLabel = "Cancel",
    ) => {
        setState({
            isOpen: true,
            type: "confirm",
            title,
            message,
            onConfirm,
            confirmLabel,
            cancelLabel,
        });
    };

    const showLoading = (title: string, message: string) => {
        setState({
            isOpen: true,
            type: "loading",
            title,
            message,
        });
    };

    const closeModal = () => {
        setState((prev) => ({ ...prev, isOpen: false }));
        setIsLoading(false);
    };

    return {
        ...state,
        isLoading,
        setIsLoading,
        showSuccess,
        showError,
        showConfirm,
        showLoading,
        closeModal,
    };
};
