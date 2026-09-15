module.exports = {
  apps: [
    {
      name: "MyNiyyah",
      script: ".output/server/index.mjs",
      cwd: "/root/live/MyNiyyah",
      env: {
        "POSTGRES_USER":"myniyyah",
        "POSTGRES_PASSWORD":"replace-with-local-postgres-password",
        "POSTGRES_DB":"myniyyah",
        "DATABASE_URL":"postgresql://myniyyah:replace-with-local-postgres-password@localhost:5432/myniyyah",
        "PGADMIN_DEFAULT_EMAIL":"admin@myniyyah.local",
        "PGADMIN_DEFAULT_PASSWORD": "replace-with-local-pgadmin-password",
        "BETTER_AUTH_URL":"http://localhost:3000",
        "BETTER_AUTH_TRUSTED_ORIGINS":"http://localhost:3000,http://192.168.1.4:3000",
        "BETTER_AUTH_SECRET":"replace-with-generated-secret+hJskIZ4SAGukZoKW5WebXm9+RqFr14EbGw="
      }
    },
  ],
};
