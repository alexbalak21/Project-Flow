<template>
  <div class="min-h-screen bg-[#f3f3f5] lg:grid lg:grid-cols-[58%_42%]">
    <section class="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-14">
      <p class="text-3xl font-semibold tracking-tight text-primary-500">ProjectFlow</p>
      <div class="flex flex-1 items-center"><div class="mx-auto grid w-full max-w-md gap-5"><slot /></div></div>
    </section>
    <aside class="hidden bg-gradient-to-br from-primary-700 to-primary-500 p-14 text-white lg:flex lg:flex-col lg:justify-end">
      <p class="max-w-sm text-3xl font-semibold leading-snug">Plan projects, assign tasks and ship, without the enterprise overhead.</p>
      <p class="mt-4 text-blue-100">Free for small teams. Pro from €12/month.</p>
    </aside>
  </div>
</template>
