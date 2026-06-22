"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-120px" }}
      variants={fadeUp}
      className="mx-auto mb-10 max-w-3xl text-center sm:mb-12"
    >
      <p className="mb-4 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-cyberBlue sm:text-xs sm:tracking-[0.34em]">
        {eyebrow}
      </p>
      <h2 className="text-balance text-[2rem] font-semibold leading-[1.04] tracking-[-0.04em] text-frost sm:text-5xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-mist sm:mt-5 sm:text-lg">
        {description}
      </p>
    </motion.div>
  );
}
