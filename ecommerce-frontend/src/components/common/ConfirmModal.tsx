import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";

interface Confirmation {
    isOpen: boolean;
    onClose: () => void,
    onConfirm: () => void,
    title: string,
    confirmButton?: string,
    cancelButton?: string,
    loading?: boolean
}

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, confirmButton = "Confirm", cancelButton = "Cancel", loading }: Confirmation) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-[400px]" showCloseButton={false}>
            <div className="p-4">
                <h1 className="text-lg font-medium mb-4 dark:text-white">{title}</h1>
                <div className="flex justify-end items-center gap-x-4">
                    <Button size="sm" variant="outline" onClick={onClose}>{cancelButton}</Button>
                    <Button size="sm" onClick={onConfirm}>{loading ? `${confirmButton}...` : confirmButton}</Button>
                </div>
            </div>
        </Modal>

    )
}

export default ConfirmModal