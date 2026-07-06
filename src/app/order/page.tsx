"use client";
import PublicOrdering from "@/components/PublicOrdering";

export default function RetailOrderPage() {
  return <PublicOrdering fixedCustomerType="RETAIL" hideCustomerSelection={true} />;
}
