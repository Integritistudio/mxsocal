import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import Image from "next/image";
import { AddCoachProps, CoachTableOrder } from "@/utils/types";
import { MdDelete } from "react-icons/md";
import { FaRegEdit } from "react-icons/fa";
import AddCoach from "./AddCoach";
import ConfirmModal from "../common/ConfirmModal";
import { useAlert } from "@/context/AlertContext";
import { useUser } from "@/context/UserContext";
import { deleteCoachById } from "@/services/coach";



const getTableData = (data: AddCoachProps[]) => {
  return data?.map((row) => ({
    id: row.id,
    user: {
      image: row.profileImage ?? "/user_icon.png",
      name: `${row.firstName ?? ""} ${row.lastName ?? ""}`,
      email: row.email ?? "",
    },
    phone: row?.phone ?? "-",
    city: row.city ?? "-",
    state: row?.state ?? "-",
    country: row?.country ?? "-",
    experience: `${row.experience ?? 0} yrs`,
  })) ?? [];
};

export default function CoachTable({ coaches, loadCoaches }: { coaches: AddCoachProps[], loadCoaches: () => any }) {
  const router = useRouter();
  const { hasPermission } = useUser();
  const { showAlert } = useAlert();
  const formattedCoaches = getTableData(coaches)
  const [selectedCoach, setSelectedCoach] = useState<AddCoachProps | null>(null);
  const [deletionId, setDeletionId] = useState<any>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [openConfirm, setOpenConfirm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false)

  const openEdit = (id: any) => {
    const coach = coaches.find((c) => c.id === id);
    if (coach) {
      setSelectedCoach(coach);
      setOpen(true);
    }
  }

  const onCloseEdit = () => {
    setSelectedCoach(null);
    setOpen(false);
  }

  const openDelete = (id: any) => {
    setDeletionId(id);
    setOpenConfirm(true);
  }
  const closeDelete = () => {
    setDeletionId(null);
    setOpenConfirm(false);
  }

  const handleConfirmDelete = async () => {
    if (!deletionId) return;
    try {
      setLoading(true);
      await deleteCoachById(deletionId);
      loadCoaches?.()
      showAlert("success", "Coach deleted successfully");
      setDeletionId(null);
      setOpenConfirm(false)
    } catch (err) {
      showAlert("error", "Failed to delete coach");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-full">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow>
                {["User", "Phone", "City", "State", "Country", "Experience", ...((hasPermission("coach:update") || hasPermission("coach:delete")) ? [""] : [])].map((label, index) => (
                  <TableCell
                    isHeader
                    key={index}
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
              {formattedCoaches.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 overflow-hidden rounded-full">
                        <Image
                          width={40}
                          height={40}
                          src={order?.user?.image ?? "/user_icon.png"}
                          alt={order?.user?.name || "Image"}
                          className="w-full h-full bg-cover"
                        />
                      </div>
                      <div>
                        <span
                          className="block font-medium hover:text-blue-400 transition-all duration-300 cursor-pointer text-gray-800 text-theme-sm dark:text-white/90 dark:hover:text-blue-600"
                          onClick={() => order.id && router.push(`/dashboard/coaches/${order.id}`)}
                        >
                          {order.user.name}
                        </span>

                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                          {order.user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {order.phone}
                  </TableCell>
                  {["city", "state", "country", "experience"].map((value: string, index) => (
                    <TableCell key={index} className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {String(order[value as keyof typeof order])}
                    </TableCell>
                  ))}
                  {(hasPermission("coach:update") || hasPermission("coach:delete")) && (
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <div className="flex justify-center items-center gap-x-2">
                        {hasPermission("coach:update") && (
                          <FaRegEdit className="text-blue-500 text-lg cursor-pointer" onClick={() => openEdit(order.id)} />
                        )}
                        {hasPermission("coach:delete") && (
                          <MdDelete className="text-red-500 text-lg cursor-pointer" onClick={() => openDelete(order.id)} />
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <AddCoach
        isOpen={open}
        onClose={onCloseEdit}
        coachData={selectedCoach}
        isEditMode={true}
        loadCoaches={loadCoaches}
      />
      <ConfirmModal
        isOpen={openConfirm}
        onClose={closeDelete}
        onConfirm={handleConfirmDelete}
        title={"Are you sure you want to delete the coach?"}
        loading={loading}
      />
    </div>
  );
}
