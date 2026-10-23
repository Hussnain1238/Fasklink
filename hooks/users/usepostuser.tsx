"use client";

import { useMutation } from "@tanstack/react-query";
import { postdata } from "@/lib/api/user";

export const usePostData = () => {
  return useMutation({
    mutationFn: postdata,
  });
};