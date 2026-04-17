/* StageToggle — inline active/inactive toggle for stage node overlay */
import React from "react";
import { useEditorStore } from "../../stores/editorStore";

interface StageToggleProps {
  sessionId: string;
  stageOrder: number;
  isActive: boolean;
}

const StageToggle: React.FC<StageToggleProps> = ({
  sessionId,
  stageOrder,
  isActive,
}) => {
  const setStageActive = useEditorStore((s) => s.setStageActive);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await setStageActive(sessionId, stageOrder, !isActive);
  };

  return (
    <button
      className={`w-4 h-4 rounded-full border-2 transition-colors ${
        isActive
          ? "border-emerald-400 bg-emerald-400/30"
          : "border-gray-500 bg-gray-500/30"
      }`}
      onClick={handleToggle}
      title={isActive ? "Deactivate stage" : "Activate stage"}
    />
  );
};

export default StageToggle;
