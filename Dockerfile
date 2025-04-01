# Use the official Jekyll image
FROM jekyll/jekyll:latest

# Set the working directory
WORKDIR /srv/jekyll

# Copy Gemfile and Gemfile.lock (if available)
COPY Gemfile* ./

# Change the owner of /srv/jekyll so the jekyll user can write to it
RUN chown -R jekyll:jekyll /srv/jekyll

# Switch to the jekyll user
USER jekyll

# Configure Bundler to install gems locally
# This will install gems to vendor/bundle instead of system directories.
RUN bundle install --path vendor/bundle

# Copy the rest of your project files into the container, setting ownership
COPY --chown=jekyll:jekyll . .

# Expose port 4000
EXPOSE 4000

# Serve the site
CMD ["jekyll", "serve", "--watch", "--force_polling", "--host", "0.0.0.0"]

