<template>
  <div class="w-64 bg-gray-900 text-white p-4">
    <h2 class="text-xl font-bold mb-6">ONYR</h2>

    <nav class="space-y-2">
      <router-link to="/" class="block p-2 rounded hover:bg-gray-700">
        Dashboard
      </router-link>

      <router-link to="/claims" class="block p-2 rounded hover:bg-gray-700">
        Claims
      </router-link>

      <router-link to="/create-claim" class="block p-2 rounded hover:bg-gray-700">
        Create Claim
      </router-link>

      <router-link to="/fnol" class="block p-2 rounded hover:bg-gray-700">
        FNOL
      </router-link>

      <router-link to="/inspection/new" class="block p-2 rounded hover:bg-gray-700">
        Inspection Form
      </router-link>

      <router-link to="/preliminary-report" class="block p-2 rounded hover:bg-gray-700">
        Preliminary Report
      </router-link>

    </nav>
  </div>
</template>
