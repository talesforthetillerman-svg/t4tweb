import { type StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Tales for the Tillerman')
    .items([
      S.listItem()
        .title('Site Settings')
        .child(
          S.documentList()
            .title('Site Settings')
            .filter('_type == "siteSettings"')
        ),
      S.divider(),
      S.listItem()
        .title('Pages & Sections')
        .child(
          S.list()
            .title('Pages & Sections')
            .items([
              S.listItem()
                .title('Hero Section')
                .child(
                  S.documentList()
                    .title('Hero Section')
                    .filter('_type == "heroSection"')
                ),
              S.listItem()
                .title('Intro banner (GIF block)')
                .child(
                  S.documentList()
                    .title('Intro banner (GIF block)')
                    .filter('_type == "introBanner"')
                ),
              S.listItem()
                .title('About Section')
                .child(
                  S.documentList()
                    .title('About Section')
                    .filter('_type == "aboutSection"')
                ),
              S.listItem()
                .title('Band Members')
                .child(
                  S.documentList()
                    .title('Band Members')
                    .filter('_type == "bandMember"')
                    .defaultOrdering([{ field: '_createdAt', direction: 'asc' }])
                ),
              S.listItem()
                .title('Latest Release')
                .child(
                  S.documentList()
                    .title('Latest Release')
                    .filter('_type == "latestRelease"')
                ),
              S.divider(),
              S.listItem()
                .title('Concerts')
                .child(
                  S.documentList()
                    .title('Concerts')
                    .filter('_type == "concert"')
                    .defaultOrdering([{ field: 'date', direction: 'desc' }])
                ),
              S.listItem()
                .title('Press Kit')
                .child(
                  S.documentList()
                    .title('Press Kit')
                    .filter('_type == "pressKitSection"')
                ),
              S.listItem()
                .title('Contact Section')
                .child(
                  S.documentList()
                    .title('Contact Section')
                    .filter('_type == "contactSection"')
                ),
              S.divider(),
              S.listItem()
                .title('Navigation')
                .child(
                  S.documentList()
                    .title('Navigation')
                    .filter('_type == "navigation"')
                ),
            ])
        ),
    ])