"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ProductData } from "../payment-flow"

interface ProductInfoProps {
  productData: ProductData
  onNext: () => void
}

export default function ProductInfo({ productData, onNext }: ProductInfoProps) {
  const isProduct = !!productData.id

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{isProduct ? "Product Information" : "Creator Information"}</h2>

      <Card className="p-6">
        {isProduct ? (
          <div className="flex flex-col md:flex-row gap-6">
            {productData.image && (
              <div className="w-full md:w-1/3">
                <div className="relative aspect-square rounded-md overflow-hidden">
                  <Image
                    src={productData.image || "/placeholder.svg"}
                    alt={productData.title || "Product image"}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold">{productData.title}</h3>
              <p className="text-muted-foreground mt-2">{productData.description}</p>
              <div className="mt-4">
                <span className="text-2xl font-bold">${productData.price?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {productData.avatar && (
              <div className="relative w-16 h-16 rounded-full overflow-hidden">
                <Image
                  src={productData.avatar || "/placeholder.svg"}
                  alt={productData.username || "User avatar"}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold">{productData.username}</h3>
              <p className="text-muted-foreground">Send payment to this creator</p>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  )
}

