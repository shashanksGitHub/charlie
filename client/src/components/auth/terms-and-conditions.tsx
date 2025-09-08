import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNationalityAwareTranslate } from "@/hooks/use-nationality-aware-translate";

interface TermsAndConditionsProps {
  onBack: () => void;
  onComplete: () => void;
  isLoading?: boolean;
}

export function TermsAndConditions({
  onBack,
  onComplete,
  isLoading = false,
}: TermsAndConditionsProps) {
  const [agreed, setAgreed] = useState(false);
  const { translate } = useNationalityAwareTranslate();

  return (
    <div className="flex flex-col h-full">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-primary">
          {translate("auth.completeRegistration")}
        </h2>
        <p className="text-gray-600">
          {translate("auth.reviewAndAcceptTerms")}
        </p>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="prose prose-sm max-w-none">
          <h3>{translate("auth.termsAndConditionsTitle")}</h3>
          <p>{translate("auth.welcomeToCharleyTerms")}</p>

          <h4>{translate("auth.acceptanceOfTermsTitle")}</h4>
          <p>{translate("auth.acceptanceOfTermsText")}</p>

          <h4>{translate("auth.eligibilityTitle")}</h4>
          <p>{translate("auth.eligibilityText")}</p>

          <h4>{translate("auth.accountSecurityTitle")}</h4>
          <p>{translate("auth.accountSecurityText")}</p>

          <h4>{translate("auth.userConductTitle")}</h4>
          <p>{translate("auth.userConductIntro")}</p>
          <ul>
            <li>{translate("auth.userConductItem1")}</li>
            <li>{translate("auth.userConductItem2")}</li>
            <li>{translate("auth.userConductItem3")}</li>
            <li>{translate("auth.userConductItem4")}</li>
            <li>{translate("auth.userConductItem5")}</li>
            <li>{translate("auth.userConductItem6")}</li>
          </ul>

          <h4>{translate("auth.contentTitle")}</h4>
          <p>{translate("auth.contentText")}</p>

          <h4>{translate("auth.privacyTitle")}</h4>
          <p>{translate("auth.privacyText")}</p>

          <h4>{translate("auth.terminationTitle")}</h4>
          <p>{translate("auth.terminationText")}</p>

          <h4>{translate("auth.changesTitle")}</h4>
          <p>{translate("auth.changesText")}</p>

          <h4>{translate("auth.liabilityTitle")}</h4>
          <p>{translate("auth.liabilityText")}</p>

          <h4>{translate("auth.contactTitle")}</h4>
          <p>{translate("auth.contactText")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Checkbox
          id="terms"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
        />
        <label
          htmlFor="terms"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {translate("auth.acceptTermsCheckbox")}
        </label>
      </div>

      <div className="flex justify-between">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {translate("common.back")}
        </Button>

        <Button
          onClick={onComplete}
          className="bg-primary text-white flex items-center"
          disabled={!agreed || isLoading}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {translate("auth.completing")}
            </>
          ) : (
            <>
              {translate("auth.completeProfile")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
